export default {
  multipass: true,
  js2svg: {
    pretty: false,
    indent: 0
  },
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          cleanupIds: false,
          mergePaths: false
        }
      }
    },
    { name: 'sortAttrs' }
  ]
};
