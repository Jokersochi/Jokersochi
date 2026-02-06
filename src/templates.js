export const templates = [
  {
    id: 'soft-glow',
    name: 'Нежное сияние',
    description:
      'Полупрозрачные румяна, деликатное сияние и лёгкий блеск для губ создают свежий нюдовый образ, который подчёркивает естественную текстуру кожи.',
    preview: 'linear-gradient(135deg, #fbbdd0 0%, #fef3d7 48%, #c9caf8 100%)',
    defaultVariant: 'rose',
    defaults: {
      intensity: 0.82,
      scale: 1,
      rotation: 0,
      warmth: 0.15,
      exposure: 0.04,
      offsetX: 0,
      offsetY: 0
    },
    filters: {
      brightness: 1.03,
      contrast: 1.02,
      saturate: 1.12,
      warmth: 0.08
    },
    tags: ['Подчёркнутая кожа', 'Натуральный дневной свет', 'Мягкие румяна'],
    overlays: [
      {
        id: 'soft-glow-blush-left',
        group: 'blush',
        type: 'ellipse',
        x: 0.34,
        y: 0.62,
        rx: 0.15,
        ry: 0.09,
        blur: 0.08,
        opacity: 0.75,
        color: '#f5a7c5'
      },
      {
        id: 'soft-glow-blush-right',
        group: 'blush',
        type: 'ellipse',
        x: 0.66,
        y: 0.62,
        rx: 0.15,
        ry: 0.09,
        blur: 0.08,
        opacity: 0.75,
        color: '#f5a7c5'
      },
      {
        id: 'soft-glow-shadow-left',
        group: 'shadow',
        type: 'ellipse',
        x: 0.36,
        y: 0.38,
        rx: 0.13,
        ry: 0.055,
        rotation: -18,
        blur: 0.018,
        opacity: 0.9,
        color: '#c0a6e2'
      },
      {
        id: 'soft-glow-shadow-right',
        group: 'shadow',
        type: 'ellipse',
        x: 0.64,
        y: 0.38,
        rx: 0.13,
        ry: 0.055,
        rotation: 18,
        blur: 0.018,
        opacity: 0.9,
        color: '#c0a6e2'
      },
      {
        id: 'soft-glow-lip-base',
        group: 'lips',
        type: 'ellipse',
        x: 0.5,
        y: 0.76,
        rx: 0.18,
        ry: 0.055,
        blur: 0.01,
        opacity: 0.92,
        color: '#d97493'
      },
      {
        id: 'soft-glow-lip-highlight',
        group: 'highlight',
        type: 'ellipse',
        x: 0.5,
        y: 0.74,
        rx: 0.14,
        ry: 0.02,
        blur: 0.012,
        opacity: 0.4,
        blend: 'screen',
        color: 'rgba(255, 255, 255, 0.95)'
      },
      {
        id: 'soft-glow-inner-highlight-left',
        group: 'highlight',
        type: 'ellipse',
        x: 0.42,
        y: 0.39,
        rx: 0.035,
        ry: 0.022,
        blur: 0.01,
        opacity: 0.55,
        blend: 'screen',
        color: '#ffe9f7'
      },
      {
        id: 'soft-glow-inner-highlight-right',
        group: 'highlight',
        type: 'ellipse',
        x: 0.58,
        y: 0.39,
        rx: 0.035,
        ry: 0.022,
        blur: 0.01,
        opacity: 0.55,
        blend: 'screen',
        color: '#ffe9f7'
      },
      {
        id: 'soft-glow-brow-left',
        group: 'highlight',
        type: 'ellipse',
        x: 0.34,
        y: 0.33,
        rx: 0.11,
        ry: 0.02,
        rotation: -5,
        blur: 0.008,
        opacity: 0.35,
        blend: 'screen',
        color: '#ffecf9'
      },
      {
        id: 'soft-glow-brow-right',
        group: 'highlight',
        type: 'ellipse',
        x: 0.66,
        y: 0.33,
        rx: 0.11,
        ry: 0.02,
        rotation: 5,
        blur: 0.008,
        opacity: 0.35,
        blend: 'screen',
        color: '#ffecf9'
      }
    ],
    variants: [
      {
        id: 'rose',
        name: 'Розовый шёлк',
        description: 'Мягкий розовый подтон подчёркивает свежесть кожи и добавляет лёгкое сияние.',
        preview: ['#f7a6c2', '#d47d9f', '#b9c2f9'],
        roles: {
          blush: '#f7a6c2',
          shadow: '#c2a8f1',
          lips: '#d87495',
          highlight: '#ffeaf8'
        },
        intensity: {
          highlight: 0.8
        }
      },
      {
        id: 'peach',
        name: 'Персиковая вуаль',
        description: 'Тёплая персиковая палитра создаёт солнечный и лёгкий образ.',
        preview: ['#ffb59d', '#f5948f', '#fce4b6'],
        roles: {
          blush: '#ffb59d',
          shadow: '#f0b4bd',
          lips: '#e77b5f',
          highlight: '#fff1da'
        },
        intensity: {
          highlight: 0.7
        }
      },
      {
        id: 'lilac',
        name: 'Сиреневая дымка',
        description: 'Холодный сиреневый акцент освежает взгляд и подчёркивает контраст кожи.',
        preview: ['#e8a5f0', '#cf73b8', '#b5bdf9'],
        roles: {
          blush: '#e8a5f0',
          shadow: '#b5bdf9',
          lips: '#cf73b8',
          highlight: '#f6eaff'
        },
        intensity: {
          shadow: 1.05,
          highlight: 0.75
        }
      }
    ]
  },
  {
    id: 'evening-drama',
    name: 'Вечерняя драма',
    description:
      'Контрастный smoky eyes с графичными стрелками и насыщенными губами создаёт выразительный вечерний образ.',
    preview: 'linear-gradient(135deg, #3a1c40 0%, #7f3c63 48%, #f6a8c2 100%)',
    defaultVariant: 'plum',
    defaults: {
      intensity: 0.9,
      scale: 1.02,
      rotation: 0,
      warmth: 0.02,
      exposure: -0.02,
      offsetX: 0,
      offsetY: 0
    },
    filters: {
      brightness: 0.98,
      contrast: 1.08,
      saturate: 1.15,
      warmth: 0
    },
    tags: ['Выразительные глаза', 'Акцент на контуры', 'Подходит для вечера'],
    overlays: [
      {
        id: 'evening-shadow-left',
        group: 'shadow',
        type: 'ellipse',
        x: 0.35,
        y: 0.37,
        rx: 0.16,
        ry: 0.065,
        rotation: -20,
        blur: 0.02,
        opacity: 0.95,
        color: '#5a3d6e'
      },
      {
        id: 'evening-shadow-right',
        group: 'shadow',
        type: 'ellipse',
        x: 0.65,
        y: 0.37,
        rx: 0.16,
        ry: 0.065,
        rotation: 20,
        blur: 0.02,
        opacity: 0.95,
        color: '#5a3d6e'
      },
      {
        id: 'evening-smoke-left',
        group: 'shadow',
        type: 'ellipse',
        x: 0.33,
        y: 0.36,
        rx: 0.19,
        ry: 0.09,
        rotation: -25,
        blur: 0.045,
        opacity: 0.55,
        color: '#342036'
      },
      {
        id: 'evening-smoke-right',
        group: 'shadow',
        type: 'ellipse',
        x: 0.67,
        y: 0.36,
        rx: 0.19,
        ry: 0.09,
        rotation: 25,
        blur: 0.045,
        opacity: 0.55,
        color: '#342036'
      },
      {
        id: 'evening-liner-left',
        group: 'liner',
        type: 'ellipse',
        x: 0.34,
        y: 0.38,
        rx: 0.15,
        ry: 0.018,
        rotation: -16,
        blur: 0.004,
        opacity: 0.9,
        color: '#221322'
      },
      {
        id: 'evening-liner-right',
        group: 'liner',
        type: 'ellipse',
        x: 0.66,
        y: 0.38,
        rx: 0.15,
        ry: 0.018,
        rotation: 16,
        blur: 0.004,
        opacity: 0.9,
        color: '#221322'
      },
      {
        id: 'evening-lips-base',
        group: 'lips',
        type: 'ellipse',
        x: 0.5,
        y: 0.77,
        rx: 0.17,
        ry: 0.052,
        blur: 0.008,
        opacity: 0.95,
        color: '#9b284b'
      },
      {
        id: 'evening-lips-center',
        group: 'highlight',
        type: 'ellipse',
        x: 0.5,
        y: 0.76,
        rx: 0.12,
        ry: 0.02,
        blur: 0.01,
        opacity: 0.35,
        blend: 'screen',
        color: '#ffcfdf'
      },
      {
        id: 'evening-lips-shadow',
        group: 'contour',
        type: 'ellipse',
        x: 0.5,
        y: 0.79,
        rx: 0.19,
        ry: 0.06,
        blur: 0.012,
        opacity: 0.4,
        blend: 'multiply',
        color: '#2b1d33'
      },
      {
        id: 'evening-contour-left',
        group: 'contour',
        type: 'ellipse',
        x: 0.27,
        y: 0.63,
        rx: 0.12,
        ry: 0.11,
        rotation: -8,
        blur: 0.06,
        opacity: 0.35,
        blend: 'multiply',
        color: '#2b1d33'
      },
      {
        id: 'evening-contour-right',
        group: 'contour',
        type: 'ellipse',
        x: 0.73,
        y: 0.63,
        rx: 0.12,
        ry: 0.11,
        rotation: 8,
        blur: 0.06,
        opacity: 0.35,
        blend: 'multiply',
        color: '#2b1d33'
      }
    ],
    variants: [
      {
        id: 'plum',
        name: 'Слива в дымке',
        description: 'Холодные сливовые оттенки усиливают глубину взгляда и подчёркивают цвет глаз.',
        preview: ['#5d3a7a', '#93294a', '#ffd6e8'],
        roles: {
          shadow: '#5d3a7a',
          liner: '#221322',
          lips: '#93294a',
          highlight: '#ffd6e8',
          contour: '#2d1b2c'
        },
        intensity: {
          liner: 1.05,
          highlight: 0.45
        }
      },
      {
        id: 'bronze',
        name: 'Бронзовый дым',
        description: 'Тёплая бронзовая гамма добавляет коже загара и подчёркивает скулы.',
        preview: ['#593b2d', '#b54838', '#ffdfc1'],
        roles: {
          shadow: '#593b2d',
          liner: '#2f1a13',
          lips: '#b54838',
          highlight: '#ffdfc1',
          contour: '#2b1c18'
        },
        intensity: {
          contour: 1.1,
          highlight: 0.4
        }
      },
      {
        id: 'emerald',
        name: 'Изумрудный бархат',
        description: 'Глубокие зелёные тени подчёркивают карие и тёмные глаза, добавляя образу загадочности.',
        preview: ['#315052', '#953052', '#f6d8ff'],
        roles: {
          shadow: '#315052',
          liner: '#1c2b2e',
          lips: '#953052',
          highlight: '#f6d8ff',
          contour: '#22343c'
        },
        intensity: {
          shadow: 1.1,
          highlight: 0.42
        }
      }
    ]
  },
  {
    id: 'color-pop',
    name: 'Цветовой акцент',
    description:
      'Графичные стрелки, насыщённые тени и сочные губы помогут создать смелый творческий образ для съёмки или вечеринки.',
    preview: 'linear-gradient(135deg, #00b0ff 0%, #ff6cab 50%, #ffd75e 100%)',
    defaultVariant: 'aqua',
    defaults: {
      intensity: 0.78,
      scale: 1.04,
      rotation: 0,
      warmth: -0.05,
      exposure: 0.05,
      offsetX: 0,
      offsetY: 0
    },
    filters: {
      brightness: 1.05,
      contrast: 1.04,
      saturate: 1.2,
      warmth: 0.02
    },
    tags: ['Творческий макияж', 'Акцент на глаза', 'Подходит для фотосъёмки'],
    overlays: [
      {
        id: 'color-shadow-left',
        group: 'shadow',
        type: 'ellipse',
        x: 0.35,
        y: 0.36,
        rx: 0.16,
        ry: 0.06,
        rotation: -14,
        blur: 0.018,
        opacity: 0.92,
        color: '#2c9bd4'
      },
      {
        id: 'color-shadow-right',
        group: 'shadow',
        type: 'ellipse',
        x: 0.65,
        y: 0.36,
        rx: 0.16,
        ry: 0.06,
        rotation: 14,
        blur: 0.018,
        opacity: 0.92,
        color: '#2c9bd4'
      },
      {
        id: 'color-wing-left',
        group: 'liner',
        type: 'ellipse',
        x: 0.31,
        y: 0.37,
        rx: 0.19,
        ry: 0.022,
        rotation: -24,
        blur: 0.008,
        opacity: 0.85,
        color: '#0b6fc0'
      },
      {
        id: 'color-wing-right',
        group: 'liner',
        type: 'ellipse',
        x: 0.69,
        y: 0.37,
        rx: 0.19,
        ry: 0.022,
        rotation: 24,
        blur: 0.008,
        opacity: 0.85,
        color: '#0b6fc0'
      },
      {
        id: 'color-blush-left',
        group: 'blush',
        type: 'ellipse',
        x: 0.33,
        y: 0.64,
        rx: 0.16,
        ry: 0.095,
        blur: 0.07,
        opacity: 0.65,
        color: '#fcb6d9'
      },
      {
        id: 'color-blush-right',
        group: 'blush',
        type: 'ellipse',
        x: 0.67,
        y: 0.64,
        rx: 0.16,
        ry: 0.095,
        blur: 0.07,
        opacity: 0.65,
        color: '#fcb6d9'
      },
      {
        id: 'color-lips-base',
        group: 'lips',
        type: 'ellipse',
        x: 0.5,
        y: 0.77,
        rx: 0.18,
        ry: 0.054,
        blur: 0.01,
        opacity: 0.9,
        color: '#ff6dac'
      },
      {
        id: 'color-lips-highlight',
        group: 'highlight',
        type: 'ellipse',
        x: 0.5,
        y: 0.75,
        rx: 0.13,
        ry: 0.025,
        blur: 0.012,
        opacity: 0.5,
        blend: 'screen',
        color: '#ffeaf5'
      },
      {
        id: 'color-brow-left',
        group: 'highlight',
        type: 'ellipse',
        x: 0.34,
        y: 0.32,
        rx: 0.1,
        ry: 0.02,
        rotation: -6,
        blur: 0.01,
        opacity: 0.4,
        blend: 'screen',
        color: '#f8f0ff'
      },
      {
        id: 'color-brow-right',
        group: 'highlight',
        type: 'ellipse',
        x: 0.66,
        y: 0.32,
        rx: 0.1,
        ry: 0.02,
        rotation: 6,
        blur: 0.01,
        opacity: 0.4,
        blend: 'screen',
        color: '#f8f0ff'
      }
    ],
    variants: [
      {
        id: 'aqua',
        name: 'Аквамарин',
        description: 'Бирюзовые тени подчёркивают глаза и создают свежий акцент.',
        preview: ['#3aaae0', '#007dbb', '#ff6dac'],
        roles: {
          shadow: '#3aaae0',
          liner: '#007dbb',
          lips: '#ff6dac',
          blush: '#fcb6d9',
          highlight: '#f8f0ff'
        },
        intensity: {
          liner: 0.95,
          highlight: 0.6
        }
      },
      {
        id: 'sunset',
        name: 'Закат',
        description: 'Огненные оттенки создают эффект заходящего солнца и подчёркивают скулы.',
        preview: ['#ff8f6f', '#f0434c', '#ff6161'],
        roles: {
          shadow: '#ff8f6f',
          liner: '#f0434c',
          lips: '#ff6161',
          blush: '#ffb27c',
          highlight: '#ffe4d0'
        },
        intensity: {
          blush: 0.8,
          highlight: 0.55
        }
      },
      {
        id: 'violet',
        name: 'Фиолетовый неон',
        description: 'Футуристичный образ с неоновыми стрелками и яркими губами.',
        preview: ['#9d63ff', '#5e2ed3', '#ff5ea3'],
        roles: {
          shadow: '#9d63ff',
          liner: '#5e2ed3',
          lips: '#ff5ea3',
          blush: '#dca2ff',
          highlight: '#ffe4ff'
        },
        intensity: {
          shadow: 1,
          liner: 1.05,
          highlight: 0.58
        }
      }
    ]
  }
];
