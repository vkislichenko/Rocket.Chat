/*globals Importer*/



Importer.Base = class ImporterBase {
	static getBSONSafeArraysFromAnArray(theArray) {
		const BSONSize = Importer.Base.getBSONSize(theArray);
		const maxSize = Math.floor(theArray.length / (Math.ceil(BSONSize / Importer.Base.MaxBSONSize)));
		const safeArrays = [];
		let i = 0;
		while (i < theArray.length) {
			safeArrays.push(theArray.slice(i, i += maxSize));
		}
		return safeArrays;
	}
	static getBSONSize(object) {
		const BSON = require('bson')['native']().BSON;
		const bson = new BSON();
		return bson.calculateObjectSize(object);
	}

	constructor(name, description, mimeType) {
		this.MaxBSONSize = 8000000;
		this.http = Npm.require('http');
		this.https = Npm.require('https');
		this.name = name;
		this.description = description;
		this.mimeType = mimeType;
		this.logger = new Logger(`${ this.name } Importer`, {});
		this.progress = new Importer.Progress(this.name);
		this.collection = Importer.RawImports;
		this.AdmZip = Npm.require('adm-zip');
		this.getFileType = Npm.require('file-type');
		const importId = Importer.Imports.insert({
			'type': this.name,
			'ts': Date.now(),
			'status': this.progress.step,
			'valid': true,
			'user': Meteor.user()._id
		});
		this.importRecord = Importer.Imports.findOne(importId);
		this.users = {};
		this.channels = {};
		this.messages = {};
	}

	prepare(dataURI, sentContentType, fileName) {
		const fileType = this.getFileType(new Buffer(dataURI.split(',')[1], 'base64'));
		this.logger.debug('Uploaded file information is:', fileType);
		this.logger.debug('Expected file type is:', this.mimeType);
		if (!fileType || fileType.mime !== this.mimeType) {
			this.logger.warn(`Invalid file uploaded for the ${ this.name } importer.`);
			throw new Meteor.Error('error-invalid-file-uploaded', `Invalid file uploaded to import ${ this.name } data from.`, {
				step: 'prepare'
			});
		}
		this.updateProgress(Importer.ProgressStep.PREPARING_STARTED);
		return this.updateRecord({
			'file': fileName
		});
	}

	startImport(importSelection) {
		if (importSelection === undefined) {
			throw new Error(`No selected users and channel data provided to the ${ this.name } importer.`);
		} else if (importSelection.users === undefined) {
			throw new Error(`Users in the selected data wasn't found, it must but at least an empty array for the ${ this.name } importer.`);
		} else if (importSelection.channels === undefined) {
			throw new Error(`Channels in the selected data wasn't found, it must but at least an empty array for the ${ this.name } importer.`);
		}
		return this.updateProgress(Importer.ProgressStep.IMPORTING_STARTED);
	}

	getSelection() {
		throw new Error(`Invalid 'getSelection' called on ${ this.name }, it must be overridden and super can not be called.`);
	}

	getProgress() {
		return this.progress;
	}

	updateProgress(step) {
		this.progress.step = step;
		this.logger.debug(`${ this.name } is now at ${ step }.`);
		this.updateRecord({
			'status': this.progress.step
		});
		return this.progress;
	}

	addCountToTotal(count) {
		this.progress.count.total = this.progress.count.total + count;
		this.updateRecord({
			'count.total': this.progress.count.total
		});
		return this.progress;
	}

	addCountCompleted(count) {
		this.progress.count.completed = this.progress.count.completed + count;
		if ((this.progress.count.completed % 500 === 0) || this.progress.count.completed >= this.progress.count.total) {
			this.updateRecord({
				'count.completed': this.progress.count.completed
			});
		}
		return this.progress;
	}

	updateRecord(fields) {
		Importer.Imports.update({
			_id: this.importRecord._id
		}, {
			$set: fields
		});
		this.importRecord = Importer.Imports.findOne(this.importRecord._id);
		return this.importRecord;
	}

	uploadFile(details, fileUrl, user, room, timeStamp) {
		this.logger.debug(`Uploading the file ${ details.name } from ${ fileUrl }.`);
		const requestModule = /https/i.test(fileUrl) ? Importer.Base.https : Importer.Base.http;
		return requestModule.get(fileUrl, Meteor.bindEnvironment(function(stream) {
			const fileId = Meteor.fileStore.create(details);
			if (fileId) {
				return Meteor.fileStore.write(stream, fileId, function(err, file) {
					if (err) {
						throw new Error(err);
					} else {
						const url = file.url.replace(Meteor.absoluteUrl(), '/');
						const attachment = {
							title: `File Uploaded: ${ file.name }`,
							title_link: url
						};
						if (/^image\/.+/.test(file.type)) {
							attachment.image_url = url;
							attachment.image_type = file.type;
							attachment.image_size = file.size;
							if (file.identify && file.identify.size) {
								attachment.image_dimensions = file.identify.size;
							}
						}
						if (/^audio\/.+/.test(file.type)) {
							attachment.audio_url = url;
							attachment.audio_type = file.type;
							attachment.audio_size = file.size;
						}
						if (/^video\/.+/.test(file.type)) {
							attachment.video_url = url;
							attachment.video_type = file.type;
							attachment.video_size = file.size;
						}
						const msg = {
							rid: details.rid,
							ts: timeStamp,
							msg: '',
							file: {
								_id: file._id
							},
							groupable: false,
							attachments: [attachment]
						};
						if ((details.message_id != null) && (typeof details.message_id === 'string')) {
							msg['_id'] = details.message_id;
						}
						return RocketChat.sendMessage(user, msg, room, true);
					}
				});
			} else {
				return this.logger.error(`Failed to create the store for ${ fileUrl }!!!`);
			}
		}));
	}
};
