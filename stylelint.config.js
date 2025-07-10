module.exports = {
  extends: ['stylelint-config-standard'],
  rules: {
    // Запрещаем физические CSS-свойства (margin-left, padding-right и т.д.)
    'declaration-property-value-disallowed-list': {
      '/^(margin|padding|border)-(left|right|top|bottom)/': [/.*/],
      '/^(left|right|top|bottom)$/': [/.*/],
      '/^(width|height)$/': [/.*/],
      '/^border-radius$/': [/.*/],
      '/^border-(top|bottom|left|right)-(left|right)-radius$/': [/.*/]
    }
  }
}; 