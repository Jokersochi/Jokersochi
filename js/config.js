/**
 * Расширенная конфигурация игры Русская Монополия
 * Содержит все настройки, данные карточек и многоязычную локализацию
 */

const CONFIG = {
    // Основные настройки игры
    GAME: {
        STARTING_MONEY: 2000,
        MAX_PLAYERS: 6,
        MIN_PLAYERS: 2,
        BOARD_SIZE: 40,
        JAIL_POSITION: 9,
        GO_TO_JAIL_POSITION: 30,
        FREE_PARKING_POSITION: 20,
        START_POSITION: 0,
        DEFAULT_LANGUAGE: 'ru',
        SUPPORTED_LANGUAGES: ['ru', 'en', 'de', 'fr', 'es', 'zh', 'ja', 'ko']
    },

    // Настройки аукциона
    AUCTION: {
        MIN_BID: 10,
        TIME_LIMIT: 30, // секунды
        AUTO_PASS_TIME: 10, // автоматический пропуск через N секунд
        BID_INCREMENT: 10, // минимальный шаг ставки
        EXTENSION_TIME: 15 // продление времени при новой ставке
    },

    // Настройки резиденций
    RESIDENCE: {
        MIN_PROPERTIES: 3, // минимальное количество свойств одного цвета для строительства
        RENT_MULTIPLIER: 2, // множитель арендной платы
        BUILD_COST: 500, // стоимость строительства резиденции
        MAX_RESIDENCES: 3 // максимальное количество резиденций на участке
    },

    // Настройки улучшений
    IMPROVEMENT: {
        MAX_LEVEL: 5,
        COST_PER_LEVEL: 200,
        RENT_INCREASE: 0.5, // увеличение аренды на 50% за уровень
        DISCOUNT_MULTIPLIER: 0.8 // скидка при полном владении цветовой группой
    },

    // Настройки погоды
    WEATHER: [
        {
            type: 'sunny',
            name: 'Солнечно',
            en_name: 'Sunny',
            de_name: 'Sonnig',
            fr_name: 'Ensoleillé',
            es_name: 'Soleado',
            zh_name: '晴天',
            ja_name: '晴れ',
            ko_name: '맑음',
            duration: 3,
            effects: { rent: 1.1, movement: 1, building: 1.1 },
            intensity: 1
        },
        {
            type: 'rainy',
            name: 'Дождливо',
            en_name: 'Rainy',
            de_name: 'Regnerisch',
            fr_name: 'Pluvieux',
            es_name: 'Lluvioso',
            zh_name: '雨天',
            ja_name: '雨',
            ko_name: '비',
            duration: 2,
            effects: { rent: 0.9, movement: 0.9, building: 0.8 },
            intensity: 1
        },
        {
            type: 'snowy',
            name: 'Снежно',
            en_name: 'Snowy',
            de_name: 'Schneereich',
            fr_name: 'Neigeux',
            es_name: 'Nevado',
            zh_name: '雪天',
            ja_name: '雪',
            ko_name: '눈',
            duration: 2,
            effects: { rent: 0.7, movement: 0.7, building: 0.6 },
            intensity: 1
        },
        {
            type: 'stormy',
            name: 'Шторм',
            en_name: 'Stormy',
            de_name: 'Stürmisch',
            fr_name: 'Orageux',
            es_name: 'Tormentoso',
            zh_name: '暴风雨',
            ja_name: '嵐',
            ko_name: '폭풍',
            duration: 1,
            effects: { rent: 0.5, movement: 0.5, building: 0.3 },
            intensity: 2
        },
        {
            type: 'foggy',
            name: 'Туманно',
            en_name: 'Foggy',
            de_name: 'Neblig',
            fr_name: 'Brumeux',
            es_name: 'Neblinoso',
            zh_name: '雾天',
            ja_name: '霧',
            ko_name: '안개',
            duration: 2,
            effects: { rent: 0.8, movement: 0.8, building: 1 },
            intensity: 1
        }
    ],

    // Настройки экономических событий
    ECONOMIC_EVENTS: [
        {
            type: 'boom',
            name: 'Экономический бум',
            en_name: 'Economic Boom',
            de_name: 'Wirtschaftsboom',
            fr_name: 'Boom économique',
            es_name: 'Auge económico',
            zh_name: '经济繁荣',
            ja_name: '経済ブーム',
            ko_name: '경제 호황',
            duration: 5,
            propertyValue: 1.3,
            income: 1.2,
            taxes: 0.9
        },
        {
            type: 'crisis',
            name: 'Экономический кризис',
            en_name: 'Economic Crisis',
            de_name: 'Wirtschaftskrise',
            fr_name: 'Crise économique',
            es_name: 'Crisis económica',
            zh_name: '经济危机',
            ja_name: '経済危機',
            ko_name: '경제 위기',
            duration: 5,
            propertyValue: 0.7,
            income: 0.8,
            taxes: 1.1
        },
        {
            type: 'inflation',
            name: 'Инфляция',
            en_name: 'Inflation',
            de_name: 'Inflation',
            fr_name: 'Inflation',
            es_name: 'Inflación',
            zh_name: '通货膨胀',
            ja_name: 'インフレ',
            ko_name: '인플레이션',
            duration: 3,
            propertyValue: 1.1,
            income: 0.9,
            taxes: 1.05
        },
        {
            type: 'deflation',
            name: 'Дефляция',
            en_name: 'Deflation',
            de_name: 'Deflation',
            fr_name: 'Déflation',
            es_name: 'Deflación',
            zh_name: '通货紧缩',
            ja_name: 'デフレ',
            ko_name: '디플레이션',
            duration: 3,
            propertyValue: 0.9,
            income: 1.1,
            taxes: 0.95
        }
    ],

    // Настройки культурных событий
    CULTURAL_EVENTS: [
        {
            type: 'festival',
            name: 'Культурный фестиваль',
            en_name: 'Cultural Festival',
            de_name: 'Kulturfestival',
            fr_name: 'Festival culturel',
            es_name: 'Festival cultural',
            zh_name: '文化节',
            ja_name: '文化祭',
            ko_name: '문화제',
            duration: 3,
            tourism: 1.5,
            culture: 1.3
        },
        {
            type: 'olympics',
            name: 'Олимпийские игры',
            en_name: 'Olympic Games',
            de_name: 'Olympische Spiele',
            fr_name: 'Jeux olympiques',
            es_name: 'Juegos olímpicos',
            zh_name: '奥运会',
            ja_name: 'オリンピック',
            ko_name: '올림픽',
            duration: 4,
            tourism: 2.0,
            culture: 1.5
        },
        {
            type: 'exhibition',
            name: 'Международная выставка',
            en_name: 'International Exhibition',
            de_name: 'Internationale Ausstellung',
            fr_name: 'Exposition internationale',
            es_name: 'Exposición internacional',
            zh_name: '国际展览',
            ja_name: '国際博覧会',
            ko_name: '국제 박람회',
            duration: 3,
            tourism: 1.4,
            culture: 1.2
        },
        {
            type: 'concert',
            name: 'Мега-концерт',
            en_name: 'Mega Concert',
            de_name: 'Mega-Konzert',
            fr_name: 'Méga-concert',
            es_name: 'Mega-concierto',
            zh_name: '大型音乐会',
            ja_name: 'メガコンサート',
            ko_name: '메가 콘서트',
            duration: 2,
            tourism: 1.3,
            culture: 1.4
        }
    ],

    // Достижения
    ACHIEVEMENTS: [
        {
            id: 'first_property',
            type: 'properties',
            condition: 1,
            name: 'Первый домовладелец',
            en_name: 'First Property Owner',
            de_name: 'Erster Immobilienbesitzer',
            fr_name: 'Premier propriétaire',
            es_name: 'Primer propietario',
            zh_name: '第一个房东',
            ja_name: '初めての家主',
            ko_name: '첫 번째 집주인',
            description: 'Купите свою первую недвижимость',
            en_description: 'Purchase your first property',
            icon: '🏠'
        },
        {
            id: 'millionaire',
            type: 'money',
            condition: 10000,
            name: 'Миллионер',
            en_name: 'Millionaire',
            de_name: 'Millionär',
            fr_name: 'Millionnaire',
            es_name: 'Millonario',
            zh_name: '百万富翁',
            ja_name: '百万長者',
            ko_name: '백만장자',
            description: 'Накопите 10,000₽',
            en_description: 'Accumulate 10,000$',
            icon: '💰'
        },
        {
            id: 'property_tycoon',
            type: 'properties',
            condition: 10,
            name: 'Недвижимый магнат',
            en_name: 'Property Tycoon',
            de_name: 'Immobilienmagnat',
            fr_name: 'Magnat immobilier',
            es_name: 'Magnate inmobiliario',
            zh_name: '房地产大亨',
            ja_name: '不動産王',
            ko_name: '부동산 재벌',
            description: 'Владейте 10 объектами недвижимости',
            en_description: 'Own 10 properties',
            icon: '🏢'
        },
        {
            id: 'trade_master',
            type: 'trades',
            condition: 5,
            name: 'Мастер торговли',
            en_name: 'Trade Master',
            de_name: 'Handelsmeister',
            fr_name: 'Maître du commerce',
            es_name: 'Maestro del comercio',
            zh_name: '交易大师',
            ja_name: '取引マスター',
            ko_name: '거래 마스터',
            description: 'Завершите 5 торговых сделок',
            en_description: 'Complete 5 trade deals',
            icon: '🤝'
        },
        {
            id: 'auction_king',
            type: 'auctions',
            condition: 3,
            name: 'Король аукционов',
            en_name: 'Auction King',
            de_name: 'Auktionskönig',
            fr_name: 'Roi des enchères',
            es_name: 'Rey de las subastas',
            zh_name: '拍卖之王',
            ja_name: 'オークション王',
            ko_name: '경매왕',
            description: 'Выиграйте 3 аукциона',
            en_description: 'Win 3 auctions',
            icon: '👑'
        }
    ],

    // Турниры
    TOURNAMENT: {
        elimination: {
            name: 'На выбывание',
            en_name: 'Elimination',
            de_name: 'Ausscheidung',
            fr_name: 'Élimination',
            es_name: 'Eliminación',
            zh_name: '淘汰赛',
            ja_name: 'トーナメント',
            ko_name: '토너먼트'
        },
        points: {
            name: 'По очкам',
            en_name: 'Points',
            de_name: 'Punkte',
            fr_name: 'Points',
            es_name: 'Puntos',
            zh_name: '积分赛',
            ja_name: 'ポイント制',
            ko_name: '포인트제'
        },
        round_robin: {
            name: 'Круговой',
            en_name: 'Round Robin',
            de_name: 'Jeder gegen jeden',
            fr_name: 'Chacun contre chacun',
            es_name: 'Todos contra todos',
            zh_name: '循环赛',
            ja_name: '総当たり',
            ko_name: '리그전'
        }
    },

    // Расширенная локализация
    LOCALES: {
        ru: {
            // Общие термины
            COMMON: {
                START: 'СТАРТ',
                JAIL: 'ТЮРЬМА',
                FREE_PARKING: 'БЕСПЛАТНАЯ ПАРКОВКА',
                GO_TO_JAIL: 'ИДИТЕ В ТЮРЬМУ',
                CHANCE: 'ШАНС',
                TREASURE: 'КАЗНА',
                TAX: 'НАЛОГ',
                MONEY: '₽',
                YES: 'Да',
                NO: 'Нет',
                OK: 'OK',
                CANCEL: 'Отмена',
                CONFIRM: 'Подтвердить',
                BUY: 'Купить',
                SELL: 'Продать',
                PASS: 'Пропустить',
                END_TURN: 'Завершить ход',
                ROLL_DICE: 'Бросить кости',
                SETTINGS: 'Настройки',
                RULES: 'Правила',
                STATISTICS: 'Статистика',
                ACHIEVEMENTS: 'Достижения',
                TRADE: 'Торговля',
                AUCTION: 'Аукцион',
                ALLIANCE: 'Альянс',
                TOURNAMENT: 'Турнир',
                CHAT: 'Чат',
                SAVE: 'Сохранить',
                LOAD: 'Загрузить',
                EXPORT: 'Экспорт',
                IMPORT: 'Импорт',
                FULLSCREEN: 'Полноэкранный режим',
                SOUND: 'Звук',
                MUSIC: 'Музыка',
                LANGUAGE: 'Язык',
                THEME: 'Тема',
                HELP: 'Помощь',
                ABOUT: 'О игре',
                VERSION: 'Версия',
                CREDITS: 'Авторы',
                FEEDBACK: 'Обратная связь',
                BUG_REPORT: 'Сообщить об ошибке',
                FEATURE_REQUEST: 'Предложить функцию',
                ACHIEVEMENTS_BTN: 'Достижения',
                STATISTICS_BTN: 'Статистика',
                TOURNAMENTS_BTN: 'Турниры',
                ACHIEVEMENTS_TITLE: 'Достижения',
                STATISTICS_TITLE: 'Статистика',
                TOURNAMENTS_TITLE: 'Турниры',
                ACHIEVEMENTS_NONE: 'Нет достижений',
                STATISTICS_NONE: 'Нет данных по статистике',
                TOURNAMENTS_NONE: 'Нет активных турниров'
            },

            // Игровые сообщения
            MESSAGES: {
                GAME_START: 'Игра началась! Первый ход за {player}.',
                PLAYER_TURN: 'Ход игрока {player}',
                DICE_ROLL: '{player} выбросил {dice1} и {dice2}',
                PROPERTY_PURCHASED: '{player} купил {property} за {price}₽',
                RENT_PAID: '{player} заплатил аренду {amount}₽ игроку {owner}',
                GO_MONEY: '{player} получил 2000₽ за проход через СТАРТ',
                JAIL_VISIT: '{player} отправился в тюрьму',
                BANKRUPTCY: '{player} обанкротился!',
                GAME_OVER: 'Игра окончена! Победитель: {winner}',
                AUCTION_START: 'Начинается аукцион участка {property}',
                AUCTION_WIN: '{player} выиграл аукцион за {amount}₽',
                RESIDENCE_BUILT: '{player} построил резиденцию на {property}',
                IMPROVEMENT_ADDED: '{player} улучшил {property} до уровня {level}',
                WEATHER_CHANGE: 'Погода изменилась на {weather}',
                ECONOMIC_EVENT: 'Экономическое событие: {event}',
                CULTURAL_EVENT: 'Культурное событие: {event}',
                CHANCE_CARD: 'Карточка Шанс: {text}',
                TREASURE_CARD: 'Карточка Казна: {text}',
                TRADE_OFFER: '{from} предлагает сделку {to}',
                TRADE_ACCEPTED: 'Сделка между {from} и {to} завершена',
                TRADE_REJECTED: '{to} отклонил предложение {from}',
                TRADE_EXPIRED: 'Предложение торговли от {from} к {to} истекло',
                ALLIANCE_FORMED: 'Сформирован альянс: {players}',
                ALLIANCE_BROKEN: 'Альянс распался: {players}',
                TOURNAMENT_START: 'Начинается турнир: {type}',
                TOURNAMENT_END: 'Турнир окончен! Победитель: {winner}',
                ACHIEVEMENT_UNLOCKED: '{player} получил достижение: {achievement}',
                LEVEL_UP: '{player} достиг уровня {level}',
                SPECIAL_EVENT: 'Специальное событие: {event}',
                BONUS_MONEY: '{player} получил бонус {amount}₽',
                PENALTY_MONEY: '{player} заплатил штраф {amount}₽',
                FREE_PROPERTY: '{player} получил бесплатную недвижимость',
                LOSE_PROPERTY: '{player} потерял недвижимость',
                MOVE_FORWARD: '{player} продвигается на {spaces} клеток',
                MOVE_BACKWARD: '{player} отступает на {spaces} клеток',
                GO_TO_PROPERTY: '{player} отправляется на {property}',
                COLLECT_FROM_ALL: '{player} собирает {amount}₽ со всех игроков',
                PAY_TO_ALL: '{player} платит {amount}₽ всем игрокам',
                GET_OUT_OF_JAIL: '{player} выходит из тюрьмы',
                GO_TO_JAIL: '{player} отправляется в тюрьму',
                REPAIRS: '{player} платит за ремонт {amount}₽',
                STREET_REPAIRS: '{player} платит за ремонт улиц {amount}₽',
                ADVANCE_TO_GO: '{player} отправляется на СТАРТ',
                GO_BACK_3: '{player} отступает на 3 клетки',
                ELECTION_FINE: '{player} платит избирательный взнос {amount}₽',
                BUILDING_LOAN: '{player} получает кредит на строительство {amount}₽',
                CROSSWORD_PRIZE: '{player} выиграл кроссворд! Получает {amount}₽',
                BANK_ERROR: 'Ошибка банка в вашу пользу! Получаете {amount}₽',
                DOCTOR_FEE: '{player} платит врачу {amount}₽',
                CONSULTANCY_FEE: '{player} платит консультанту {amount}₽',
                STREET_REPAIRS_FEE: '{player} платит за ремонт улиц {amount}₽',
                BEAUTY_CONTEST: '{player} выиграл конкурс красоты! Получает {amount}₽',
                INHERITANCE: '{player} получил наследство {amount}₽',
                INCOME_TAX: '{player} платит подоходный налог {amount}₽',
                LUXURY_TAX: '{player} платит налог на роскошь {amount}₽'
            },

            // Ошибки
            ERRORS: {
                INSUFFICIENT_FUNDS: 'Недостаточно средств',
                PROPERTY_ALREADY_OWNED: 'Участок уже принадлежит другому игроку',
                CANNOT_BUILD: 'Нельзя строить на этом участке',
                INVALID_MOVE: 'Недопустимый ход',
                GAME_NOT_STARTED: 'Игра еще не началась',
                NOT_YOUR_TURN: 'Не ваш ход',
                PROPERTY_NOT_OWNED: 'У вас нет этого участка',
                INVALID_TRADE: 'Недопустимая сделка',
                TRADE_NOT_FOUND: 'Предложение торговли не найдено',
                ALLIANCE_FULL: 'Альянс уже полный',
                TOURNAMENT_IN_PROGRESS: 'Турнир уже идет',
                ACHIEVEMENT_ALREADY_UNLOCKED: 'Достижение уже разблокировано',
                INVALID_AMOUNT: 'Недопустимая сумма',
                INVALID_PROPERTY: 'Недопустимая недвижимость',
                CANNOT_MORTGAGE: 'Нельзя заложить эту недвижимость',
                CANNOT_UNMORTGAGE: 'Нельзя выкупить эту недвижимость',
                INVALID_BID: 'Недопустимая ставка',
                AUCTION_ENDED: 'Аукцион уже завершен',
                PLAYER_NOT_FOUND: 'Игрок не найден',
                GAME_SAVE_ERROR: 'Ошибка сохранения игры',
                GAME_LOAD_ERROR: 'Ошибка загрузки игры',
                NETWORK_ERROR: 'Ошибка сети',
                SERVER_ERROR: 'Ошибка сервера',
                TIMEOUT_ERROR: 'Превышено время ожидания',
                VALIDATION_ERROR: 'Ошибка валидации',
                PERMISSION_ERROR: 'Недостаточно прав',
                RESOURCE_NOT_FOUND: 'Ресурс не найден',
                CONFIGURATION_ERROR: 'Ошибка конфигурации',
                UNKNOWN_ERROR: 'Неизвестная ошибка'
            },

            // Подсказки
            TOOLTIPS: {
                PROPERTY_INFO: 'Информация о недвижимости',
                PLAYER_INFO: 'Информация об игроке',
                GAME_RULES: 'Правила игры',
                SETTINGS_HELP: 'Помощь по настройкам',
                TRADE_HELP: 'Помощь по торговле',
                AUCTION_HELP: 'Помощь по аукционам',
                ALLIANCE_HELP: 'Помощь по альянсам',
                TOURNAMENT_HELP: 'Помощь по турнирам',
                ACHIEVEMENTS_HELP: 'Помощь по достижениям',
                STATISTICS_HELP: 'Помощь по статистике',
                CHAT_HELP: 'Помощь по чату',
                SAVE_HELP: 'Помощь по сохранению',
                LOAD_HELP: 'Помощь по загрузке',
                EXPORT_HELP: 'Помощь по экспорту',
                IMPORT_HELP: 'Помощь по импорту',
                FULLSCREEN_HELP: 'Переключить полноэкранный режим',
                SOUND_HELP: 'Настройки звука',
                MUSIC_HELP: 'Настройки музыки',
                LANGUAGE_HELP: 'Выбор языка',
                THEME_HELP: 'Выбор темы оформления',
                HELP_HELP: 'Справка по игре',
                ABOUT_HELP: 'Информация об игре',
                VERSION_HELP: 'Версия игры',
                CREDITS_HELP: 'Авторы игры',
                FEEDBACK_HELP: 'Обратная связь',
                BUG_REPORT_HELP: 'Сообщить об ошибке',
                FEATURE_REQUEST_HELP: 'Предложить функцию'
            },

            // Статистика
            STATISTICS: {
                GAMES_PLAYED: 'Игр сыграно',
                GAMES_WON: 'Игр выиграно',
                TOTAL_MONEY: 'Всего денег',
                TOTAL_PROPERTIES: 'Всего недвижимости',
                TOTAL_TRADES: 'Всего сделок',
                TOTAL_AUCTIONS: 'Всего аукционов',
                ACHIEVEMENTS_UNLOCKED: 'Достижений разблокировано',
                TIME_PLAYED: 'Время игры',
                AVERAGE_GAME_TIME: 'Среднее время игры',
                LONGEST_GAME: 'Самая длинная игра',
                SHORTEST_GAME: 'Самая короткая игра',
                MOST_MONEY: 'Максимум денег',
                MOST_PROPERTIES: 'Максимум недвижимости',
                MOST_TRADES: 'Максимум сделок',
                MOST_AUCTIONS: 'Максимум аукционов',
                WIN_RATE: 'Процент побед',
                AVERAGE_POSITION: 'Средняя позиция',
                BEST_POSITION: 'Лучшая позиция',
                WORST_POSITION: 'Худшая позиция'
            }
        },

        en: {
            // English translations
            COMMON: {
                START: 'START',
                JAIL: 'JAIL',
                FREE_PARKING: 'FREE PARKING',
                GO_TO_JAIL: 'GO TO JAIL',
                CHANCE: 'CHANCE',
                TREASURE: 'TREASURE',
                TAX: 'TAX',
                MONEY: '$',
                YES: 'Yes',
                NO: 'No',
                OK: 'OK',
                CANCEL: 'Cancel',
                CONFIRM: 'Confirm',
                BUY: 'Buy',
                SELL: 'Sell',
                PASS: 'Pass',
                END_TURN: 'End Turn',
                ROLL_DICE: 'Roll Dice',
                SETTINGS: 'Settings',
                RULES: 'Rules',
                STATISTICS: 'Statistics',
                ACHIEVEMENTS: 'Achievements',
                TRADE: 'Trade',
                AUCTION: 'Auction',
                ALLIANCE: 'Alliance',
                TOURNAMENT: 'Tournament',
                CHAT: 'Chat',
                SAVE: 'Save',
                LOAD: 'Load',
                EXPORT: 'Export',
                IMPORT: 'Import',
                FULLSCREEN: 'Fullscreen',
                SOUND: 'Sound',
                MUSIC: 'Music',
                LANGUAGE: 'Language',
                THEME: 'Theme',
                HELP: 'Help',
                ABOUT: 'About',
                VERSION: 'Version',
                CREDITS: 'Credits',
                FEEDBACK: 'Feedback',
                BUG_REPORT: 'Bug Report',
                FEATURE_REQUEST: 'Feature Request',
                ACHIEVEMENTS_BTN: 'Achievements',
                STATISTICS_BTN: 'Statistics',
                TOURNAMENTS_BTN: 'Tournaments',
                ACHIEVEMENTS_TITLE: 'Achievements',
                STATISTICS_TITLE: 'Statistics',
                TOURNAMENTS_TITLE: 'Tournaments',
                ACHIEVEMENTS_NONE: 'No achievements',
                STATISTICS_NONE: 'No statistics data',
                TOURNAMENTS_NONE: 'No active tournaments'
            },

            MESSAGES: {
                GAME_START: 'Game started! First turn: {player}.',
                PLAYER_TURN: '{player}\'s turn',
                DICE_ROLL: '{player} rolled {dice1} and {dice2}',
                PROPERTY_PURCHASED: '{player} purchased {property} for {price}$',
                RENT_PAID: '{player} paid {amount}$ rent to {owner}',
                GO_MONEY: '{player} received 2000$ for passing START',
                JAIL_VISIT: '{player} went to jail',
                BANKRUPTCY: '{player} went bankrupt!',
                GAME_OVER: 'Game over! Winner: {winner}',
                AUCTION_START: 'Auction starting for {property}',
                AUCTION_WIN: '{player} won auction for {amount}$',
                RESIDENCE_BUILT: '{player} built residence on {property}',
                IMPROVEMENT_ADDED: '{player} improved {property} to level {level}',
                WEATHER_CHANGE: 'Weather changed to {weather}',
                ECONOMIC_EVENT: 'Economic event: {event}',
                CULTURAL_EVENT: 'Cultural event: {event}',
                CHANCE_CARD: 'Chance card: {text}',
                TREASURE_CARD: 'Treasure card: {text}',
                TRADE_OFFER: '{from} offers trade to {to}',
                TRADE_ACCEPTED: 'Trade between {from} and {to} completed',
                TRADE_REJECTED: '{to} rejected {from}\'s offer',
                TRADE_EXPIRED: 'Trade offer from {from} to {to} expired',
                ALLIANCE_FORMED: 'Alliance formed: {players}',
                ALLIANCE_BROKEN: 'Alliance broken: {players}',
                TOURNAMENT_START: 'Tournament started: {type}',
                TOURNAMENT_END: 'Tournament ended! Winner: {winner}',
                ACHIEVEMENT_UNLOCKED: '{player} unlocked achievement: {achievement}',
                LEVEL_UP: '{player} reached level {level}',
                SPECIAL_EVENT: 'Special event: {event}',
                BONUS_MONEY: '{player} received bonus {amount}$',
                PENALTY_MONEY: '{player} paid penalty {amount}$',
                FREE_PROPERTY: '{player} received free property',
                LOSE_PROPERTY: '{player} lost property',
                MOVE_FORWARD: '{player} advances {spaces} spaces',
                MOVE_BACKWARD: '{player} retreats {spaces} spaces',
                GO_TO_PROPERTY: '{player} goes to {property}',
                COLLECT_FROM_ALL: '{player} collects {amount}$ from all players',
                PAY_TO_ALL: '{player} pays {amount}$ to all players',
                GET_OUT_OF_JAIL: '{player} gets out of jail',
                GO_TO_JAIL: '{player} goes to jail',
                REPAIRS: '{player} pays repairs {amount}$',
                STREET_REPAIRS: '{player} pays street repairs {amount}$',
                ADVANCE_TO_GO: '{player} advances to GO',
                GO_BACK_3: '{player} goes back 3 spaces',
                ELECTION_FINE: '{player} pays election fine {amount}$',
                BUILDING_LOAN: '{player} receives building loan {amount}$',
                CROSSWORD_PRIZE: '{player} won crossword! Receives {amount}$',
                BANK_ERROR: 'Bank error in your favor! Receive {amount}$',
                DOCTOR_FEE: '{player} pays doctor fee {amount}$',
                CONSULTANCY_FEE: '{player} pays consultancy fee {amount}$',
                STREET_REPAIRS_FEE: '{player} pays street repairs fee {amount}$',
                BEAUTY_CONTEST: '{player} won beauty contest! Receives {amount}$',
                INHERITANCE: '{player} received inheritance {amount}$',
                INCOME_TAX: '{player} pays income tax {amount}$',
                LUXURY_TAX: '{player} pays luxury tax {amount}$'
            },

            ERRORS: {
                INSUFFICIENT_FUNDS: 'Insufficient funds',
                PROPERTY_ALREADY_OWNED: 'Property already owned by another player',
                CANNOT_BUILD: 'Cannot build on this property',
                INVALID_MOVE: 'Invalid move',
                GAME_NOT_STARTED: 'Game not started yet',
                NOT_YOUR_TURN: 'Not your turn',
                PROPERTY_NOT_OWNED: 'You don\'t own this property',
                INVALID_TRADE: 'Invalid trade',
                TRADE_NOT_FOUND: 'Trade offer not found',
                ALLIANCE_FULL: 'Alliance is full',
                TOURNAMENT_IN_PROGRESS: 'Tournament in progress',
                ACHIEVEMENT_ALREADY_UNLOCKED: 'Achievement already unlocked',
                INVALID_AMOUNT: 'Invalid amount',
                INVALID_PROPERTY: 'Invalid property',
                CANNOT_MORTGAGE: 'Cannot mortgage this property',
                CANNOT_UNMORTGAGE: 'Cannot unmortgage this property',
                INVALID_BID: 'Invalid bid',
                AUCTION_ENDED: 'Auction already ended',
                PLAYER_NOT_FOUND: 'Player not found',
                GAME_SAVE_ERROR: 'Game save error',
                GAME_LOAD_ERROR: 'Game load error',
                NETWORK_ERROR: 'Network error',
                SERVER_ERROR: 'Server error',
                TIMEOUT_ERROR: 'Timeout error',
                VALIDATION_ERROR: 'Validation error',
                PERMISSION_ERROR: 'Permission denied',
                RESOURCE_NOT_FOUND: 'Resource not found',
                CONFIGURATION_ERROR: 'Configuration error',
                UNKNOWN_ERROR: 'Unknown error'
            },

            TOOLTIPS: {
                PROPERTY_INFO: 'Property information',
                PLAYER_INFO: 'Player information',
                GAME_RULES: 'Game rules',
                SETTINGS_HELP: 'Settings help',
                TRADE_HELP: 'Trade help',
                AUCTION_HELP: 'Auction help',
                ALLIANCE_HELP: 'Alliance help',
                TOURNAMENT_HELP: 'Tournament help',
                ACHIEVEMENTS_HELP: 'Achievements help',
                STATISTICS_HELP: 'Statistics help',
                CHAT_HELP: 'Chat help',
                SAVE_HELP: 'Save help',
                LOAD_HELP: 'Load help',
                EXPORT_HELP: 'Export help',
                IMPORT_HELP: 'Import help',
                FULLSCREEN_HELP: 'Toggle fullscreen mode',
                SOUND_HELP: 'Sound settings',
                MUSIC_HELP: 'Music settings',
                LANGUAGE_HELP: 'Language selection',
                THEME_HELP: 'Theme selection',
                HELP_HELP: 'Game help',
                ABOUT_HELP: 'Game information',
                VERSION_HELP: 'Game version',
                CREDITS_HELP: 'Game credits',
                FEEDBACK_HELP: 'Feedback',
                BUG_REPORT_HELP: 'Report a bug',
                FEATURE_REQUEST_HELP: 'Request a feature'
            },

            STATISTICS: {
                GAMES_PLAYED: 'Games played',
                GAMES_WON: 'Games won',
                TOTAL_MONEY: 'Total money',
                TOTAL_PROPERTIES: 'Total properties',
                TOTAL_TRADES: 'Total trades',
                TOTAL_AUCTIONS: 'Total auctions',
                ACHIEVEMENTS_UNLOCKED: 'Achievements unlocked',
                TIME_PLAYED: 'Time played',
                AVERAGE_GAME_TIME: 'Average game time',
                LONGEST_GAME: 'Longest game',
                SHORTEST_GAME: 'Shortest game',
                MOST_MONEY: 'Most money',
                MOST_PROPERTIES: 'Most properties',
                MOST_TRADES: 'Most trades',
                MOST_AUCTIONS: 'Most auctions',
                WIN_RATE: 'Win rate',
                AVERAGE_POSITION: 'Average position',
                BEST_POSITION: 'Best position',
                WORST_POSITION: 'Worst position'
            }
        },

        // Добавляем поддержку немецкого языка
        de: {
            COMMON: {
                START: 'LOS',
                JAIL: 'GEFÄNGNIS',
                FREE_PARKING: 'KOSTENLOSES PARKEN',
                GO_TO_JAIL: 'INS GEFÄNGNIS',
                CHANCE: 'CHANCE',
                TREASURE: 'SCHATZ',
                TAX: 'STEUER',
                MONEY: '€',
                YES: 'Ja',
                NO: 'Nein',
                OK: 'OK',
                CANCEL: 'Abbrechen',
                CONFIRM: 'Bestätigen',
                BUY: 'Kaufen',
                SELL: 'Verkaufen',
                PASS: 'Passen',
                END_TURN: 'Zug beenden',
                ROLL_DICE: 'Würfeln'
            },
            // ... остальные переводы для немецкого
        },

        // Добавляем поддержку французского языка
        fr: {
            COMMON: {
                START: 'DÉPART',
                JAIL: 'PRISON',
                FREE_PARKING: 'PARC GRATUIT',
                GO_TO_JAIL: 'ALLEZ EN PRISON',
                CHANCE: 'CHANCE',
                TREASURE: 'TRÉSOR',
                TAX: 'IMPÔT',
                MONEY: '€',
                YES: 'Oui',
                NO: 'Non',
                OK: 'OK',
                CANCEL: 'Annuler',
                CONFIRM: 'Confirmer',
                BUY: 'Acheter',
                SELL: 'Vendre',
                PASS: 'Passer',
                END_TURN: 'Fin du tour',
                ROLL_DICE: 'Lancer les dés'
            },
            // ... остальные переводы для французского
        },

        // Добавляем поддержку испанского языка
        es: {
            COMMON: {
                START: 'SALIDA',
                JAIL: 'CÁRCEL',
                FREE_PARKING: 'PARKING GRATUITO',
                GO_TO_JAIL: 'VE A LA CÁRCEL',
                CHANCE: 'SUERTE',
                TREASURE: 'TESORO',
                TAX: 'IMPUESTO',
                MONEY: '€',
                YES: 'Sí',
                NO: 'No',
                OK: 'OK',
                CANCEL: 'Cancelar',
                CONFIRM: 'Confirmar',
                BUY: 'Comprar',
                SELL: 'Vender',
                PASS: 'Pasar',
                END_TURN: 'Fin del turno',
                ROLL_DICE: 'Tirar dados'
            },
            // ... остальные переводы для испанского
        },

        // Добавляем поддержку китайского языка
        zh: {
            COMMON: {
                START: '起点',
                JAIL: '监狱',
                FREE_PARKING: '免费停车',
                GO_TO_JAIL: '进监狱',
                CHANCE: '机会',
                TREASURE: '宝藏',
                TAX: '税收',
                MONEY: '¥',
                YES: '是',
                NO: '否',
                OK: '确定',
                CANCEL: '取消',
                CONFIRM: '确认',
                BUY: '购买',
                SELL: '出售',
                PASS: '跳过',
                END_TURN: '结束回合',
                ROLL_DICE: '掷骰子'
            },
            // ... остальные переводы для китайского
        },

        // Добавляем поддержку японского языка
        ja: {
            COMMON: {
                START: 'スタート',
                JAIL: '刑務所',
                FREE_PARKING: '無料駐車場',
                GO_TO_JAIL: '刑務所へ行く',
                CHANCE: 'チャンス',
                TREASURE: '宝箱',
                TAX: '税金',
                MONEY: '¥',
                YES: 'はい',
                NO: 'いいえ',
                OK: 'OK',
                CANCEL: 'キャンセル',
                CONFIRM: '確認',
                BUY: '購入',
                SELL: '売却',
                PASS: 'パス',
                END_TURN: 'ターン終了',
                ROLL_DICE: 'サイコロを振る'
            },
            // ... остальные переводы для японского
        },

        // Добавляем поддержку корейского языка
        ko: {
            COMMON: {
                START: '시작',
                JAIL: '감옥',
                FREE_PARKING: '무료 주차',
                GO_TO_JAIL: '감옥으로 가기',
                CHANCE: '기회',
                TREASURE: '보물',
                TAX: '세금',
                MONEY: '₩',
                YES: '예',
                NO: '아니오',
                OK: '확인',
                CANCEL: '취소',
                CONFIRM: '확인',
                BUY: '구매',
                SELL: '판매',
                PASS: '패스',
                END_TURN: '턴 종료',
                ROLL_DICE: '주사위 굴리기'
            },
            // ... остальные переводы для корейского
        }
    },

    // Данные карточек Шанс
    CHANCE_CARDS: [
        {
            id: 1,
            type: 'money',
            amount: 500,
            text: 'Вы выиграли билеты в Большой театр! Получите 500₽',
            en_text: 'You won tickets to the Bolshoi Theatre! Receive 500$'
        },
        {
            id: 2,
            type: 'money',
            amount: -200,
            text: 'Штраф за превышение скорости. Заплатите 200₽',
            en_text: 'Speeding ticket fine. Pay 200$'
        },
        {
            id: 3,
            type: 'move',
            target: 0,
            text: 'Отправляйтесь на СТАРТ',
            en_text: 'Go to START'
        },
        {
            id: 4,
            type: 'move',
            target: 9,
            text: 'Отправляйтесь в тюрьму',
            en_text: 'Go to jail'
        },
        {
            id: 5,
            type: 'money',
            amount: 300,
            text: 'Транссибирское путешествие! Получите 300₽',
            en_text: 'Trans-Siberian journey! Receive 300$'
        },
        {
            id: 6,
            type: 'money',
            amount: -150,
            text: 'Ремонт автомобиля. Заплатите 150₽',
            en_text: 'Car repair. Pay 150$'
        },
        {
            id: 7,
            type: 'money',
            amount: 400,
            text: 'Выигрыш в лотерею! Получите 400₽',
            en_text: 'Lottery win! Receive 400$'
        },
        {
            id: 8,
            type: 'money',
            amount: -100,
            text: 'Оплата коммунальных услуг. Заплатите 100₽',
            en_text: 'Utility bill payment. Pay 100$'
        },
        {
            id: 9,
            type: 'money',
            amount: 250,
            text: 'Продажа сувениров. Получите 250₽',
            en_text: 'Souvenir sales. Receive 250$'
        },
        {
            id: 10,
            type: 'money',
            amount: -300,
            text: 'Медицинские расходы. Заплатите 300₽',
            en_text: 'Medical expenses. Pay 300$'
        },
        {
            id: 11,
            type: 'money',
            amount: 600,
            text: 'Наследство от дальнего родственника. Получите 600₽',
            en_text: 'Inheritance from distant relative. Receive 600$'
        },
        {
            id: 12,
            type: 'money',
            amount: -250,
            text: 'Штраф за парковку. Заплатите 250₽',
            en_text: 'Parking ticket. Pay 250$'
        },
        {
            id: 13,
            type: 'money',
            amount: 350,
            text: 'Продажа старой техники. Получите 350₽',
            en_text: 'Old equipment sale. Receive 350$'
        },
        {
            id: 14,
            type: 'money',
            amount: -180,
            text: 'Оплата интернета. Заплатите 180₽',
            en_text: 'Internet bill. Pay 180$'
        },
        {
            id: 15,
            type: 'money',
            amount: 450,
            text: 'Выигрыш в казино! Получите 450₽',
            en_text: 'Casino win! Receive 450$'
        },
        {
            id: 16,
            type: 'money',
            amount: -220,
            text: 'Покупка подарков. Заплатите 220₽',
            en_text: 'Gift purchases. Pay 220$'
        }
    ],

    // Данные карточек Казна
    TREASURE_CARDS: [
        {
            id: 1,
            type: 'money',
            amount: 1000,
            text: 'Выигрыш в телевикторине! Получите 1000₽',
            en_text: 'Game show win! Receive 1000$'
        },
        {
            id: 2,
            type: 'money',
            amount: -500,
            text: 'Налоговая проверка. Заплатите 500₽',
            en_text: 'Tax audit. Pay 500$'
        },
        {
            id: 3,
            type: 'money',
            amount: 800,
            text: 'Продажа акций. Получите 800₽',
            en_text: 'Stock sale. Receive 800$'
        },
        {
            id: 4,
            type: 'money',
            amount: -400,
            text: 'Ремонт квартиры. Заплатите 400₽',
            en_text: 'Apartment renovation. Pay 400$'
        },
        {
            id: 5,
            type: 'money',
            amount: 1200,
            text: 'Выигрыш в спортивном тотализаторе! Получите 1200₽',
            en_text: 'Sports betting win! Receive 1200$'
        },
        {
            id: 6,
            type: 'money',
            amount: -600,
            text: 'Покупка новой мебели. Заплатите 600₽',
            en_text: 'New furniture purchase. Pay 600$'
        },
        {
            id: 7,
            type: 'money',
            amount: 900,
            text: 'Продажа антиквариата. Получите 900₽',
            en_text: 'Antique sale. Receive 900$'
        },
        {
            id: 8,
            type: 'money',
            amount: -350,
            text: 'Оплата кредита. Заплатите 350₽',
            en_text: 'Loan payment. Pay 350$'
        },
        {
            id: 9,
            type: 'money',
            amount: 1500,
            text: 'Выигрыш в лотерее! Получите 1500₽',
            en_text: 'Lottery jackpot! Receive 1500$'
        },
        {
            id: 10,
            type: 'money',
            amount: -700,
            text: 'Покупка нового телефона. Заплатите 700₽',
            en_text: 'New phone purchase. Pay 700$'
        },
        {
            id: 11,
            type: 'money',
            amount: 1100,
            text: 'Продажа старой машины. Получите 1100₽',
            en_text: 'Old car sale. Receive 1100$'
        },
        {
            id: 12,
            type: 'money',
            amount: -450,
            text: 'Оплата страховки. Заплатите 450₽',
            en_text: 'Insurance payment. Pay 450$'
        },
        {
            id: 13,
            type: 'money',
            amount: 1300,
            text: 'Выигрыш в покер! Получите 1300₽',
            en_text: 'Poker win! Receive 1300$'
        },
        {
            id: 14,
            type: 'money',
            amount: -550,
            text: 'Покупка компьютера. Заплатите 550₽',
            en_text: 'Computer purchase. Pay 550$'
        },
        {
            id: 15,
            type: 'money',
            amount: 1400,
            text: 'Продажа коллекции марок. Получите 1400₽',
            en_text: 'Stamp collection sale. Receive 1400$'
        },
        {
            id: 16,
            type: 'money',
            amount: -650,
            text: 'Оплата обучения. Заплатите 650₽',
            en_text: 'Education payment. Pay 650$'
        }
    ],

    // Данные свойств (участков)
    PROPERTIES: [
        // Коричневые (дешевые)
        { id: 1, name: 'Арбат', price: 600, rent: [20, 100, 300, 900, 1600, 2500], color: 'brown', position: 1, logo: 'assets/brands/apple.svg' },
        { id: 3, name: 'Тверская', price: 800, rent: [40, 200, 600, 1800, 3200, 4500], color: 'brown', position: 3, logo: '🏠' },
        
        // Голубые
        { id: 5, name: 'Метро', price: 1000, rent: [60, 300, 900, 2700, 4000, 5500], color: 'lightblue', position: 5, logo: 'assets/brands/google.svg' },
        { id: 6, name: 'Эрмитаж', price: 1200, rent: [80, 400, 1000, 3000, 4500, 6000], color: 'lightblue', position: 6, logo: 'assets/brands/microsoft.svg' },
        { id: 8, name: 'Петергоф', price: 1400, rent: [100, 500, 1500, 4500, 6250, 7500], color: 'lightblue', position: 8, logo: 'assets/brands/samsung.svg' },
        
        // Розовые
        { id: 10, name: 'Красная площадь', price: 1600, rent: [120, 600, 1800, 5400, 8000, 11000], color: 'pink', position: 10, logo: '🟥' },
        { id: 11, name: 'ГУМ', price: 1800, rent: [140, 700, 2000, 6000, 9000, 12000], color: 'pink', position: 11, logo: '🏬' },
        { id: 13, name: 'ЦУМ', price: 2000, rent: [160, 800, 2200, 6600, 9800, 14000], color: 'pink', position: 13, logo: '🏬' },
        
        // Оранжевые
        { id: 14, name: 'Третьяковка', price: 2200, rent: [180, 900, 2500, 7000, 8750, 10500], color: 'orange', position: 14, logo: '🖼️' },
        { id: 15, name: 'Третьяковская галерея', price: 2400, rent: [200, 1000, 3000, 9000, 11250, 14000], color: 'orange', position: 15, logo: '🖼️' },
        { id: 16, name: 'Пушкинский музей', price: 2600, rent: [220, 1100, 3300, 8000, 9750, 11500], color: 'orange', position: 16, logo: '🖼️' },
        
        // Красные
        { id: 18, name: 'Большой театр', price: 2800, rent: [240, 1200, 3600, 8500, 10250, 12000], color: 'red', position: 18, logo: '🎭' },
        { id: 19, name: 'Мариинский театр', price: 3000, rent: [260, 1300, 3900, 9000, 11000, 12750], color: 'red', position: 19, logo: '🎭' },
        
        // Желтые
        { id: 21, name: 'Сочи', price: 3200, rent: [280, 1500, 4500, 10000, 12000, 14000], color: 'yellow', position: 21, logo: '🏖️' },
        { id: 23, name: 'Крым', price: 3400, rent: [300, 1700, 5000, 11000, 13000, 15000], color: 'yellow', position: 23, logo: '🏝️' },
        { id: 24, name: 'Казань', price: 3600, rent: [320, 1800, 5000, 12000, 14000, 16000], color: 'yellow', position: 24, logo: '🕌' },
        
        // Зеленые
        { id: 25, name: 'Екатеринбург', price: 3800, rent: [350, 1750, 5000, 11000, 13000, 15000], color: 'green', position: 25, logo: '🏙️' },
        { id: 26, name: 'Новосибирск', price: 4000, rent: [500, 2000, 6000, 14000, 17000, 20000], color: 'green', position: 26, logo: '🏙️' },
        { id: 28, name: 'Владивосток', price: 4200, rent: [550, 2200, 6600, 16000, 19500, 23000], color: 'green', position: 28, logo: '🚢' },
        
        // Синие
        { id: 29, name: 'Байкал', price: 4400, rent: [600, 2400, 7200, 18000, 22000, 25000], color: 'blue', position: 29, logo: '💧' },
        
        // Фиолетовые
        { id: 31, name: 'Камчатка', price: 4600, rent: [700, 2800, 8400, 20000, 24000, 28000], color: 'purple', position: 31, logo: '🌋' },
        { id: 32, name: 'Магадан', price: 4800, rent: [800, 3200, 9600, 22000, 26000, 30000], color: 'purple', position: 32, logo: '🏔️' },
        { id: 34, name: 'Якутск', price: 5000, rent: [900, 3600, 10800, 24000, 28000, 32000], color: 'purple', position: 34, logo: '❄️' },
        
        // Темно-синие (дорогие)
        { id: 35, name: 'Транссиб', price: 5200, rent: [1000, 4000, 12000, 26000, 30000, 34000], color: 'darkblue', position: 35, logo: '🚄' },
        { id: 37, name: 'Космодром', price: 5400, rent: [1100, 4400, 13200, 28000, 32000, 36000], color: 'darkblue', position: 37, logo: '🚀' },
        { id: 39, name: 'Москва-Сити', price: 5600, rent: [1200, 4800, 14400, 30000, 34000, 38000], color: 'darkblue', position: 39, logo: '🏢' }
    ],

    // Данные токенов (фишек)
    TOKENS: [
        { id: 'matryoshka', name: 'Матрёшка', image: 'assets/tokens/matryoshka.png' },
        { id: 'balalaika', name: 'Балалайка', image: 'assets/tokens/balalaika.png' },
        { id: 'kremlin', name: 'Кремль', image: 'assets/tokens/kremlin.png' },
        { id: 'samovar', name: 'Самовар', image: 'assets/tokens/samovar.png' },
        { id: 'bear', name: 'Медведь', image: 'assets/tokens/bear.png' },
        { id: 'troika', name: 'Тройка', image: 'assets/tokens/troika.png' }
    ],

    // Погодные условия
    WEATHER_TYPES: [
        { id: 'sunny', name: 'Солнечно', en_name: 'Sunny', effect: 'normal' },
        { id: 'rainy', name: 'Дождливо', en_name: 'Rainy', effect: 'rent_reduction' },
        { id: 'snowy', name: 'Снежно', en_name: 'Snowy', effect: 'movement_reduction' },
        { id: 'stormy', name: 'Шторм', en_name: 'Stormy', effect: 'severe_reduction' }
    ],

    // Экономические события
    ECONOMIC_EVENTS: [
        { id: 'boom', name: 'Экономический бум', en_name: 'Economic Boom', effect: 'rent_increase', multiplier: 1.5 },
        { id: 'crisis', name: 'Экономический кризис', en_name: 'Economic Crisis', effect: 'rent_decrease', multiplier: 0.7 },
        { id: 'inflation', name: 'Инфляция', en_name: 'Inflation', effect: 'cost_increase', multiplier: 1.3 },
        { id: 'deflation', name: 'Дефляция', en_name: 'Deflation', effect: 'cost_decrease', multiplier: 0.8 }
    ],

    // Культурные события
    CULTURAL_EVENTS: [
        { id: 'festival', name: 'Фестиваль', en_name: 'Festival', effect: 'rent_bonus', bonus: 200 },
        { id: 'holiday', name: 'Праздник', en_name: 'Holiday', effect: 'income_bonus', bonus: 300 },
        { id: 'exhibition', name: 'Выставка', en_name: 'Exhibition', effect: 'property_bonus', bonus: 150 },
        { id: 'concert', name: 'Концерт', en_name: 'Concert', effect: 'entertainment_bonus', bonus: 250 }
    ],

    // Звуковые эффекты
    SOUNDS: {
        DICE_ROLL: 'assets/sounds/dice_roll.mp3',
        MONEY: 'assets/sounds/money.mp3',
        PROPERTY_PURCHASE: 'assets/sounds/property_purchase.mp3',
        CARD_DRAW: 'assets/sounds/card_draw.mp3',
        AUCTION: 'assets/sounds/auction.mp3',
        VICTORY: 'assets/sounds/victory.mp3',
        BANKRUPTCY: 'assets/sounds/bankruptcy.mp3',
        BUTTON_CLICK: 'assets/sounds/button_click.mp3'
    },

    // Настройки по умолчанию
    DEFAULT_SETTINGS: {
        language: 'ru',
        soundEnabled: true,
        musicEnabled: true,
        animationsEnabled: true,
        autoSave: true,
        showTooltips: true,
        enableChat: true,
        enableAuctions: true,
        enableWeather: true,
        enableEconomicEvents: true,
        enableCulturalEvents: true
    }
};

// Экспорт конфигурации
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} 