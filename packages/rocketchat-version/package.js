Package.describe({
  name: 'rocketchat:info',
  summary: "",
  version: "1.0.0"
});

Package.registerBuildPlugin({
  name: "compileVersion",
  use: ['coffeescript'],
  sources: ['plugin/infoCompiler.coffee']
});

Package.onUse(function (api) {
  api.use('isobuild:compiler-plugin@1.0.0');
});

Package.onTest(function (api) {

});
