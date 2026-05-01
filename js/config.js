/**
 * Расширенная конфигурация игры Русская Монополия
 * Содержит все настройки, данные карточек и многоязычную локализацию
 */

export const CONFIG = {
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

    // Сетевые настройки
    NETWORK: {
        SERVER_URL: 'wss://your-game-server.com'
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

    // Настройки по умолчанию для игры и UI
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
    },

    // Настройки по умолчанию для приложения
    APP_DEFAULTS: {
        language: 'ru',
        soundVolume: 0.7,
        musicVolume: 0.5,
        masterVolume: 1.0,
        muted: false,
        autoSave: true,
        animations: true,
        particles: true,
        fullscreen: false,
        theme: 'dark'
    },
};

export default CONFIG;