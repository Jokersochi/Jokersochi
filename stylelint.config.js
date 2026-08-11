module.exports = {
  rules: {
    // Keep the project-specific logical-property policy without external plugins.
    'declaration-property-value-disallowed-list': {
      '/^(margin|padding|border)-(left|right|top|bottom)/': [/.*/],
      '/^(left|right|top|bottom)$/': [/.*/],
      '/^(width|height)$/': [/.*/],
      '/^border-radius$/': [/.*/],
      '/^border-(top|bottom|left|right)-(left|right)-radius$/': [/.*/]
    }
  }
};
