exec = Npm.require('child_process').exec
os = Npm.require('os')

Plugin.registerCompiler
	extensions: ['info']
, -> new InfoCompiler()


class InfoCompiler
	processFilesForTarget: (files) ->
		files.forEach (file) ->
			Info = JSON.parse file.getContentsAsString()
			Info.build =
				date: new Date().toISOString()
				nodeVersion: process.version
				arch: process.arch
				platform: process.platform
				osRelease: os.release()
				totalMemmory: os.totalmem()
				freeMemmory: os.freemem()
				cpus: os.cpus().length

			if process.env.TRAVIS_BUILD_NUMBER
				Info.travis =
					buildNumber: process.env.TRAVIS_BUILD_NUMBER
					branch: process.env.TRAVIS_BRANCH
					tag: process.env.TRAVIS_TAG

			exec "git log --pretty=format:'%H%n%ad%n%an%n%s' -n 1", (err, result) ->
				if not err?
					result = result.split('\n')

					Info.commit =
						hash: result.shift()
						date: result.shift()
						author: result.shift()
						subject: result.join('\n')

				exec "git describe --abbrev=0 --tags", (err, result) ->
					if not err?
						Info.commit?.tag = result.replace('\n', '')

					exec "git rev-parse --abbrev-ref HEAD", (err, result) ->
						if not err?
							Info.commit?.branch = result.replace('\n', '')

						Info = """
							RocketChat.Info = #{JSON.stringify(Info, null, 4)}
						"""

						file.addJavaScript({ data: Info, path: file.getPathInPackage() + '.js' });
