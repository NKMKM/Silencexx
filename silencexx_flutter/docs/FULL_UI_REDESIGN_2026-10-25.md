> Структурное исправление после этой итерации: [STRUCTURE_CORRECTION_2026-10-25.md](STRUCTURE_CORRECTION_2026-10-25.md). Новый вход, самостоятельная библиотека и дневник-коллекция проверены отдельно.

# CloudMind — полный UI-редизайн, 25 октября 2026

## Критерий завершения
Все UI-файлы и собственные визуальные классы включены в реестр ниже. Статусы меняются только после правок и проверки. «Проверено тестом» не означает «проверено на устройстве». API, права доступа, ограничения оплаты и сохранение черновиков сохраняются.

## Единая система: CloudMind Studio
- Фон — непрерывное пространство, без повторения градиента в каждой карточке.
- Один основной навигатор: нижний dock на телефоне; rail/sidebar на широком экране. История — только контекстный раздел чата.
- Заголовок: смысловой маркер, название, контекстное действие. Вложенные экраны: компактная панель возврата и содержательный заголовок внутри.
- Три композиции контента: редакционная поверхность (дневник/письмо), интерактивная сцена (практика/пауза), сгруппированные строки (настройки/история). Не все блоки — карточки.
- Общие компоненты: StudioHeader, StudioPanel, StudioRow, StudioTabs, StudioDisclosure, StudioGlyph, StudioNotice, StudioSheet, StudioChoice.
- Ввод: устойчивые подписи, единые состояния focus/error/disabled, сообщения ошибок рядом с действием.
- Движение: нажатие 120 мс, выбор 180 мс, раскрытие 240 мс, смена сцены 300 мс. Никаких бесконечных декоративных анимаций в списках. Учитываются reduced motion, TickerMode и сохранение состояния форм.
- Функциональные loading/error/empty/success без технических трассировок в UI. Старые данные остаются доступны при обновлении.
- Скролл остаётся для длинного пользовательского контента и доступности; основные действия не требуют прокрутки на обычном телефоне.

## Композиции до → после
|Область|До|После|
|---|---|---|
|Вход|Длинное вступление перед формой|Короткий бренд-блок, формы и способы входа впереди; пояснения раскрываются отдельно|
|Первый запуск|Длинный текст с номерами|Вступление, три смысловых блока, закреплённое продолжение|
|Онбординг|Одинаковые прямоугольные плитки|Выбор тем как типографическая сетка с общей панелью выбранного и CTA|
|Чат|Одинаковые подсказки, двухрядный большой composer|Главный сценарий + вспомогательные варианты, компактный composer, редакционный AI-ответ и контрастный пользовательский блок|
|История|Поиск + текстовый список + постоянные многоточия|Библиотека с табами, хронологическими группами, текущим разговором и единым меню действий|
|Дневник|Дата + неделя + большая рамка ввода|Редактор заметки с датой в заголовке, тонкой недельной линейкой; архив — отдельный режим чтения|
|Практики|Одна растянутая карточка|Рабочая сцена с шагами, смысловой иллюстрацией и отдельным входом в паузу|
|Входящие|Повторяющиеся email-карточки|Письма с редакционным первым сообщением и компактной хронологией; отдельный editor|
|Пауза|Иконка/слайдер/текст по центру|Управляемая сцена check-in → breathe → grounding → completion, полные ответы доступны|
|Настройки|Три таба и пустота ниже|Аккаунт в masthead, предпочтения и данные в последовательных разделах с ясными действиями|
|Профиль|Аватар, поля, раскрытия|Identity masthead, форма профиля, отдельные disclosure для email/password|
|Приватность|Текст + кнопки|Обработка данных → экспорт → явно отделённая опасная зона|
|Безопасность|Вступление и текстовое раскрытие|Содержательный safety brief и доступные действия|
|Устройства|ExpansionTile|Список устройств с текущей сессией и контекстными действиями|
|Язык|ListTile|Выбор в самостоятельных строках с языковым кодом и текущим состоянием|
|Напоминания|Большие часы + кнопки|Расписание и текущий статус в одной панели; изменить/включить/отключить рядом|
|Подписка|Длинный набор тарифных карточек|Текущий план/usage + выбор одного тарифа с деталями + история|
|Оплата|Разрозненные заголовки|Сводка выбранного тарифа + явно недоступная покупка с объяснением|
|Диалоги/меню|Разные ручные контейнеры|Единая структура заголовок → содержимое → действия с доступной отменой|

## Реестр и решения по каждому исходнику

Машиночитаемый список собственных классов и **2454 явных ссылок на конструкторы, виджеты, стили и вспомогательные API в UI-исходниках** находится в [ui_component_registry.json](ui_component_registry.json). Решения и контрольные суммы проверенных файлов — в [ui_redesign_manifest.json](ui_redesign_manifest.json). `python3 tool/audit_ui.py --check` обнаруживает новый UI-файл или изменения, ещё не включённые в ревью.

Отметка «переработано» означает изменения кода и рассмотренную композицию. Она не является обещанием проверки каждого системного диалога на реальном устройстве.

|Файл|Результат и осознанное решение|
|---|---|
|`lib/core/app_state.dart`|**Сохранено после ревью.** Не является renderer: InheritedNotifier и состояние языка/авторизации сохранены; UI реализован в потребителях.|
|`lib/core/home_widget_service.dart`|**Сохранено после ревью.** Не является renderer: синхронизация native widgets через MethodChannel сохранена.|
|`lib/core/theme/app_typography.dart`|**Переработано.** Новая шкала display/headline/label; умеренные веса, явные line heights и интервалы. Native font fallback сохранён.|
|`lib/core/theme.dart`|**Переработано.** Общая типографика и состояния ввода/кнопок; добавлены собственные темы date/time picker, menu, slider; native iOS back gesture сохранён.|
|`lib/main.dart`|**Переработано.** Перестроены launch/error/reauth сцены. Убран повторный фон. Роутинг авторизации и AppScope сохранены.|
|`lib/screens/auth_screen.dart`|**Переработано.** Перестроен порядок: бренд → режим → SSO → email. Password rules раскрываются отдельно. Google mark и официальный Apple control сохранены как идентификаторы провайдеров. Apple control получает disabled-opacity и IgnorePointer на время запроса; это покрыто отдельным тестом ожидания/ошибки.|
|`lib/screens/chat_screen.dart`|**Переработано.** Однорядный composer, контекстные tools/mood sheets, запись с явными cancel/send, audio loading; пустой чат с выбором настроения и сценариями. API/send/session logic сохранена.|
|`lib/screens/disclaimer_screen.dart`|**Переработано.** Смысловые нумерованные блоки и закреплённое продолжение. Полный текст ограничений сохранён.|
|`lib/screens/home_screen.dart`|**Переработано.** Один навигатор по breakpoint, единое окно настройки порядка, contextual library. Состояние посещённых экранов и предыдущие чаты сохраняются.|
|`lib/screens/inbox_screen.dart`|**Переработано.** Письма с акцентным первым сообщением; отдельный editor, полный reading sheet, read/unread, success/cooldown. Отправка и read API сохранены.|
|`lib/screens/journal_screen.dart`|**Переработано.** Режимы Write/Archive, календарная линейка, редакционная поверхность, явное чтение архива, split layout на wide. Черновик сохраняется также при смене даты.|
|`lib/screens/panic_screen.dart`|**Переработано.** Одна адаптивная структура всех этапов. Полные ответы доступны через scroll. Новый breathing dial; countdown приостанавливается вне активного экрана/приложения. API cadence и шаги сохранены.|
|`lib/screens/settings_screen.dart`|**Переработано.** Перестроен центр управления: identity, 2x2 shortcuts, preferences. Все вложенные страницы переведены на новые section/disclosure/row. Privacy danger zone, locale preview, schedule scene, password visibility.|
|`lib/screens/subscription_screen.dart`|**Переработано.** Текущий план и usage list, выбор одного тарифа с деталями, timeline/disclosure платежей. Payment — order summary с недоступным CTA; платежи не включены.|
|`lib/screens/tasks_screen.dart`|**Переработано.** Заново собрана practice scene с естественной высотой, этапами и отдельной pause area; закреплённый CTA с ожиданием и защитой от повторов.|
|`lib/screens/wellness_onboarding_screen.dart`|**Переработано.** Темы как компактные интерактивные строки/сетка; общий selected summary и закреплённые Continue/Skip. Сохранены все шесть интересов и backend IDs.|
|`lib/widgets/app_navigation.dart`|**Переработано.** Полностью заменён navigator: moving dock selection и responsive rail. RetainedPageStack сохранён ради черновиков и оптимизированного выключения скрытых ticker.|
|`lib/widgets/chat_visuals.dart`|**Переработано.** Кодовые блоки получили анимированное copy/success, markdown стал компактнее, tools используют новые строки. Парсинг markdown, безопасные ссылки и repaint-only background сохранены.|
|`lib/widgets/command_palette.dart`|**Переработано.** Новые result rows, высота зависит от text scale; keyboard hint только на wide. Все команды и стрелки/Enter/Esc сохранены.|
|`lib/widgets/common.dart`|**Переработано.** Новая структура modal/empty/loading/error/refresh; сохранение данных при reload, PressScale и ActionButton normal/busy/destructive. Удалены устаревшие неиспользуемые wrappers.|
|`lib/widgets/conversation_message.dart`|**Переработано.** Убраны повторные user avatar/author headers, собраны AI identity/text/time/actions; постоянная геометрия toolbar и disabled actions при запросе.|
|`lib/widgets/conversation_sidebar.dart`|**Переработано.** Новая библиотека: header/create/search/tabs/date sections, lazy rows, refresh/empty/error. Действия — единый sheet вместо popup; rename/pin/archive/share/delete сохранены.|
|`lib/widgets/design.dart`|**Переработано.** Новый ribbon motif, единый auth split scene, быстрые staged entrances и route transitions. OS reduced motion сохранён.|
|`lib/widgets/glass.dart`|**Переработано.** Переработан в тональную поверхность с focus border. Нет градиента и тени на каждом обычном блоке. Неиспользуемый бесконечный BreathingIcon удалён.|
|`lib/core/theme/app_colors.dart`|**Сохранено после ревью.** Осознанно сохранена узнаваемая палитра бренда и контрастные смысловые цвета. Изменения находятся в структуре и компонентах, не в перекраске.|
|`lib/core/theme/app_gradients.dart`|**Переработано.** Удалены неиспользуемые card/hero градиенты. Оставлены только фон и основной CTA.|
|`lib/core/theme/app_motion.dart`|**Переработано.** Единые длительности press/selection/disclosure/scene; reduced motion обрабатывается компонентами.|
|`lib/core/theme/app_radius.dart`|**Сохранено после ревью.** Сохранена базовая шкала радиусов как совместимый контракт. Новые композиции используют разные радиусы по роли, а не единую форму каждой карточки.|
|`lib/core/theme/app_spacing.dart`|**Сохранено после ревью.** Сохранена 4px шкала отступов; PageBody больше не резервирует 128px пустого места снизу.|
|`lib/widgets/studio.dart`|**Переработано.** Новая библиотека системных компонентов: header/panel/row/glyph/tabs/choice/disclosure/notice/sheet/topbar/action layout/avatar/resize. Размеры, focus, hover, press, reduced motion и семантика реализованы централизованно.|
|`ios/DailyWishWidget/DailyWishWidget.swift`|**Переработано.** Новая композиция WishView: бренд и дата → пожелание → подпись. Graphite surface. Timeline, токен и кэш не менялись.|
|`macos/DailyWishWidget/DailyWishWidget.swift`|**Переработано.** Та же композиция и margins, включая large family. Timeline и Keychain transport не менялись.|
|`android/app/src/main/res/layout/daily_wish_widget.xml`|**Переработано.** Перестроен порядок brand → wish → localized caption; обновлена иерархия текста. Resource IDs и click action сохранены.|
|`android/app/src/main/res/drawable/wish_background.xml`|**Переработано.** Graphite background/border согласован с приложением. Без новых remote-view эффектов и фоновых анимаций.|
|`lib/core/theme/app_shadows.dart`|**Удалено.** Удалён неиспользуемый набор декоративных теней; потребителей в lib/test нет.|

### Учёт компонентов внутри файлов

- `lib/core/theme/app_typography.dart`: `AppTypography`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/core/theme.dart`: `CosmicBackdrop`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/main.dart`: `SilenceApp`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/screens/auth_screen.dart`: `AuthScreen`, `_AuthScreenState`, `_GoogleMark`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/screens/chat_screen.dart`: `ChatScreen`, `ChatScreenState`, `AudioBubble`, `_AudioBubbleState`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/screens/disclaimer_screen.dart`: `DisclaimerScreen`, `_DisclaimerScreenState`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/screens/home_screen.dart`: `HomeScreen`, `_HomeScreenState`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/screens/inbox_screen.dart`: `InboxScreen`, `_InboxScreenState`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/screens/journal_screen.dart`: `JournalScreen`, `_JournalScreenState`, `_JournalWeek`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/screens/panic_screen.dart`: `PanicScreen`, `_PanicScreenState`, `BreathingCircle`, `_BreathingCircleState`, `_BreathDialPainter`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/screens/settings_screen.dart`: `SettingsScreen`, `_SettingsScreenState`, `PrivacyScreen`, `_PrivacyScreenState`, `SafetyAboutScreen`, `LanguageScreen`, `ProfileScreen`, `_ProfileScreenState`, `SessionsScreen`, `ReminderScreen`, `_ReminderScreenState`, `_SettingsIcon`, `_PreferenceSection`, `_SecurityFold`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/screens/subscription_screen.dart`: `SubscriptionScreen`, `_SubscriptionScreenState`, `PaymentScreen`, `_UsageMeter`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/screens/tasks_screen.dart`: `TasksScreen`, `_TasksScreenState`, `_PracticeJourney`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/screens/wellness_onboarding_screen.dart`: `WellnessOnboardingScreen`, `_WellnessOnboardingScreenState`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/widgets/app_navigation.dart`: `AppNavigation`, `_AppNavigationState`, `RetainedPageStack`, `_RetainedPageStackState`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/widgets/chat_visuals.dart`: `ChatAtmosphere`, `_ChatAtmosphereState`, `_AtmospherePainter`, `AiActivity`, `_AiActivityState`, `MessageContent`, `_CodeBlock`, `_CodeBlockState`, `FloatingActionMenu`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/widgets/command_palette.dart`: `WorkspaceCommand`, `_CommandPalette`, `_CommandPaletteState`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/widgets/common.dart`: `AppDialog`, `PageBody`, `AppEmptyState`, `AppLoadingState`, `AppSkeleton`, `_AppSkeletonState`, `AsyncPanel`, `_AsyncPanelState`, `PressScale`, `_PressScaleState`, `ActionButton`, `_ActionButtonState`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/widgets/conversation_message.dart`: `ConversationMessage`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/widgets/conversation_sidebar.dart`: `ConversationSidebar`, `_ConversationSidebarState`, `_HistoryRow`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/widgets/design.dart`: `QuietOrbit`, `_OrbitPainter`, `AppBadge`, `PageReveal`, `AuthFrame`, `CalmPageTransitions`, `StagedEntry`, `LivingEmblem`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/widgets/glass.dart`: `GlassSurface`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/core/theme/app_colors.dart`: `AppColors`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/core/theme/app_gradients.dart`: `AppGradients`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/core/theme/app_motion.dart`: `AppMotion`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/core/theme/app_radius.dart`: `AppRadius`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/core/theme/app_spacing.dart`: `AppSpacing`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `lib/widgets/studio.dart`: `StudioGlyph`, `StudioPanel`, `StudioHeader`, `StudioRow`, `_StudioRowState`, `StudioTabs`, `StudioChoice`, `StudioDisclosure`, `_StudioDisclosureState`, `StudioNotice`, `StudioSheet`, `StudioTopBar`, `StudioActionLayout`, `StudioAvatar`, `StudioResize`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `ios/DailyWishWidget/DailyWishWidget.swift`: `WishEntry`, `WishProvider`, `WishView`, `DailyWishWidget`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.
- `macos/DailyWishWidget/DailyWishWidget.swift`: `WishEntry`, `WishProvider`, `WishView`, `DailyWishWidget`. Решение относится к самому компоненту, его состоянию и вложенному дереву; исключения отмечены в таблице выше.

### Что удалено

- Неиспользуемые `SectionCard`, `AppSectionHeader`, `FormGroup`, `ActionPage`, `PageIntro` и их вспомогательное состояние: потребители переведены на целевые композиции и Studio-компоненты.
- Неиспользуемый `BreathingIcon` с бесконечной декоративной анимацией.
- Неиспользуемые `AppShadows` и `AppGradients.card/hero`.
- Старое состояние payment с неиспользуемыми полями email/transactionId; оформлению оплаты оставлено реальное ограничение недоступности покупки.

### Что осознанно сохранено

- Иконка и имя CloudMind; системные обозначения назад/микрофон/копирование/устройства сохраняют привычное значение.
- Официальная кнопка Apple и идентификатор Google; не маскируются собственными неузнаваемыми контролами.
- Нативное редактирование текста, выделение, autofill, меню буфера обмена и жест возврата iOS. Внешние системные permission dialogs не заменяются самодельными.
- Модели API, форматы запросов, токены, авторизация, лимиты, валюты backend, серверные правила дневника и недоступность оплаты. Изменена презентация и обработка её состояний.
- AppScope, MethodChannel native-widget sync и provider/cache/Keychain logic. Нативные пожелания получили новые деревья представления, а не новый транспорт.
- Launcher assets, native notification icon и системные launch themes рассмотрены как platform/brand assets и сохранены. Изменение лишь ради различия не является целью.

## Новые общие компоненты

`lib/widgets/studio.dart`:

|Компонент|Назначение|
|---|---|
|StudioHeader|Единая смысловая иерархия; действия переносятся при крупном тексте|
|StudioPanel|Тональная, акцентная и опасная зоны с разной ролью|
|StudioRow|Доступная строка с независимыми leading/content/action; hover/press/disabled|
|StudioGlyph, StudioAvatar|Ограниченные по размеру символы и identity с fallback|
|StudioTabs, StudioChoice|Выбор режима/параметра с анимированным состоянием и семантикой|
|StudioDisclosure|Раскрытие, отключение focus и semantics скрытого содержимого|
|StudioNotice|Recoverable error/info/success рядом с действием|
|StudioSheet, StudioTopBar|Общий язык модальных и вложенных экранов|
|StudioActionLayout|Действие остаётся в доступе; длинный контент/крупный текст получают scroll fallback|
|StudioResize|Безопасное раскрытие; при reduced motion AnimatedSize вообще не создаётся|

Обновлены также `ActionButton`, `AsyncPanel`, `AppDialog`, `AppLoadingState`, `AppEmptyState`, `PageReveal`, `QuietOrbit`, `LivingEmblem` и `RetainedPageStack`. Часть низкоуровневых native/Material text controls сохраняет внутреннюю реализацию Flutter, получив общую тему. Это необходимо для корректных IME, selection, autofill и доступности.

## Матрица состояний и проверок

|Область|Что реально проверено|Оставшиеся ограничения|
|---|---|---|
|Навигация|Один primary navigator на breakpoint, все разделы, изменение ширины/rail, сохранение редактора, кадры перехода|Физический swipe-back на iPhone не проверен|
|Кнопки и действия|normal/pressed, pending single-submit, retry после ошибки, disabled payment, provider disabled при email-запросе|Apple/Google SSO с реальными аккаунтами не выполнялся|
|Формы|Auth validation/error, profile/password раскрытие, focus exclusion закрытых блоков, черновики при табах и обновлении|Системный autofill/VoiceOver/TalkBack не проверены вручную|
|Данные|loading, initial error/retry, refresh со stale content и сохранением ввода, empty lists|Недоступность backend не подменяется тестовым success в реальном приложении|
|Чат|Загрузка/смена разговора, длинный список, клавиатура и drag-dismiss, меню/mood/attachments, preview неподдерживаемого изображения, markdown, idle/active motion|Реальный микрофон, озвучивание и audio-device playback требуют устройства|
|Дневник|Сохранение payload, read-only после записи, архив/чтение, feedback dialog, смена табов/viewport|Серверные ограничения не изменялись|
|Письма|Empty/populated, compose/send/cooldown/success, full reading, optimistic read marker с обработкой ошибки|Фикстуры не являются реальными письмами пользователей|
|Практика|Locked → opened → completed с server IDs, ожидание CTA, отдельный pause entry|Физический haptic feedback не измерялся|
|Пауза|Intro, check-in, breathing, grounding, reflection, completion; полные ответы доступны|Непрерывный таймер здесь функциональный, не декоративный|
|Подписка/данные|Сравнение тарифов, usage, disabled checkout, account dialogs, sessions disclosures|Реальная оплата остаётся недоступна; реальные удаление/экспорт аккаунта не запускались|
|Нативные виджеты|Swift/UI код включён в Apple-сборки, Android XML валиден|Внешний вид виджетов в системных галереях и Android build не проверены на устройстве|

### Адаптивность и доступность

- Widget tests: 320×720, 390×844, 844×390, 768×1024, 1280×900; светлая и тёмная темы; до 200% текста.
- Сценарии клавиатуры, длинного и пустого чата (включая drag на границе scroll), уменьшения движения, high contrast dialog, focus закрытых disclosure и сохранения черновиков.
- Не запрещён scroll для длинных записей/писем/разговоров, больших шрифтов и landscape. Насильственное отключение scroll скрыло бы содержимое и нарушило доступность.
- Все длительные декоративные анимации исключены из статичных списков; background chat painter тикает только в активном состоянии, а скрытые страницы выключены через TickerMode.

## Визуальные доказательства

[Открыть всю галерею](../build/full-ui-after/index.html): before/after в grayscale и цвете, мобильные/широкие и светлые/тёмные экраны, ошибки, редакторы, меню, заполненные состояния, все этапы паузы и 9 реальных кадров перехода с шагом 50 мс.

- PNG получены из Flutter widget tests с явно тестовыми данными, не из графического редактора.
- Шрифт визуального прогона: системный SFNS.ttf, MaterialIcons загружен из приложения. Это устраняет квадраты Ahem и отсутствующий знак валюты в старом тестовом шрифте.
- `device-ios-simulator.png` — отдельный реальный снимок запущенного приложения в iOS Simulator; не fixture screenshot.
- Native home widgets не выдаются за визуально проверенные: их отдельные preview screenshots не снимались.
- Покадровое воспроизведение не является FPS-бенчмарком.

## Изменённые тесты и инструменты

- `test/design_test.dart`: расширены фикстуры и walkthrough; светлая тема, полные состояния/меню, authentic motion frames, подробная диагностика рендеринга.
- `test/studio_components_test.dart`: сохранение редактируемой формы при refresh/error/retry, focus disclosure, press cancel и disabled rows, длинный modal при 200% текста, disabled checkout, восстановление ActionButton после ошибки, auth pending/failed state.
- Существующие `features_test`, `redesign_motion_test`, `conversation_context_test`, `app_test`, API/security/theme/home-widget tests сохранены и запускаются вместе.
- `tool/audit_ui.py`: инвентаризация и hash-check всех рассмотренных render sources.
- `tool/make_ui_review.py`: воспроизводимая галерея, сравнения и contact sheets. Pillow нужен только для contact sheets; HTML работает без него.
- `tool/profile_ui.dart`: существующий profile-mode инструмент использован на macOS с реальным приложением. Он не выполняет действий с аккаунтом.

## Сборки, измерения и пределы подтверждения

### Выполнено

- `flutter analyze`: **No issues found**, 5,6 с.
- Полный прогон `flutter test` с визуальным экспортом и SFNS: **56 passed**, включая отдельные проверки pending/error auth и неизменной недоступности оплаты.
- `python3 tool/audit_ui.py --check`: **28 Flutter UI + 4 native UI sources, 2454 constructor/API references, 0 files need review**.
- `flutter build ios --simulator --debug --no-pub`: **успешно**, последняя сборка 37,1 с; extension встроен в приложение.
- Приложение установлено и запущено в iPhone 17 Pro Simulator. Это **симулятор**, не физический iPhone.
- `flutter run --profile -d macos -t tool/profile_ui.dart --no-pub`: **успешная сборка и запуск** с extension; после измерения обычный entrypoint `lib/main.dart` собран и запущен в profile mode с последним исправлением empty-chat drag.
- Android widget XML разобран XML-парсером без ошибок. Это **не** Android build.
- 150 PNG-снимков, включая 9 реальных кадров перехода и отдельный снимок iOS Simulator; 4 contact sheets. Before/after доступны в галерее.

Логи: [анализ](../build/full-ui-after/evidence/flutter-analyze.log), [тесты](../build/full-ui-after/evidence/flutter-tests.log), [iOS build](../build/full-ui-after/evidence/ios-simulator-build.log), [macOS profile summary](../build/full-ui-after/evidence/macos-profile-summary.log), [метрики JSON](../build/full-ui-after/evidence/profile.json).

### Профилирование: наблюдения, а не обещание FPS

Последний 90-секундный замер macOS, startup/idle: **28 кадров**, build p95 **2,353 мс**, raster p95 **16,881 мс**; один build и два raster кадра превысили 16,667 мс. Ранее в этом же проходе startup-замеры давали raster p95 18,954 и 21,245 мс. Эти данные не являются доказательством стабильных 60/120 FPS: кадров мало, интерактивный сценарий не профилировался, параллельно выполнялись сборки. Без дополнительного измерения нельзя приписать медленные кадры конкретному UI-компоненту.

Проверенные оптимизации: отсутствие постоянных кадров на idle, отключение скрытых TickerMode, reduced-motion режим, отказ от повторного blur и декоративных теней на каждой строке, lazy history list, сохранение содержимого при refresh вместо полного teardown. Ни одна из этих мер сама по себе не подменяет device profiling.

### Не заявляется выполненным

- Физическое тестирование iPhone, 60/120 Hz и устройства среднего класса: телефон не подключён.
- Android build/эмулятор и TalkBack: Android SDK отсутствует.
- Реальный Apple/Google login, микрофон/камера/системные разрешения, audio device и VoiceOver: не исполнялись вручную.
- Visual preview native widgets в системных галереях iOS/macOS/Android: отдельно не снимался.
- Удаление/экспорт реального аккаунта, операции оплаты и отправка реальных пожеланий: не выполнялись в целях UI-проверки. Контракты и ограничение оплаты сохранены.
- Публикация новой версии в TestFlight: эта задача меняет и проверяет UI локально, store upload в этом проходе не выполнялся.

### Чек-лист приёмки

- [x] Все исходники с Flutter render-кодом и native widget view включены в реестр; нет файлов с неревьюенными изменениями.
- [x] Структура всех основных и вложенных экранов рассмотрена; изменения и сохранённые элементы имеют явное решение.
- [x] Общие компоненты, состояния и motion system внедрены в код.
- [x] Применимые состояния проверены кодом, widget tests и галереей в пределах автоматизированного окружения; внешние native/device сценарии перечислены отдельно.
- [x] Оригинальные пользовательские маршруты и API-контракты сохранены; общие функциональные тесты проходят.
- [x] Адаптивность, reduced motion, клавиатура, текст 200% и focus проверены автоматически.
- [x] Визуальные несоответствия, обнаруженные ручным просмотром PNG, исправлены и прогнаны повторно.
- [ ] Ручная проверка на физическом iPhone/Android, VoiceOver/TalkBack и интерактивное device profiling.

Последний незакрытый пункт нельзя честно заменить успешной сборкой или тестовым PNG. Код системного редизайна внесён; это явный предел подтверждения качества на текущем оборудовании.

### Воспроизведение

```sh
flutter analyze
flutter test --dart-define=DESIGN_REVIEW_FONT=/System/Library/Fonts/SFNS.ttf --dart-define=DESIGN_REVIEW_DIR=build/full-ui-after
python3 tool/audit_ui.py --check
python3 tool/make_ui_review.py
flutter build ios --simulator --debug --no-pub
flutter run --profile -d macos -t tool/profile_ui.dart --no-pub
```

Для contact sheets Python должен иметь Pillow; генерация HTML не требует Pillow. На этом Mac использован временный venv `/tmp/cloudmind-ui-review-venv`, зависимости приложения для галереи не менялись. Apple-сборки использовали существующий локальный SDK shim `/tmp/cloudmind-xcrun`; он не добавлялся в исходники приложения.


Заключительный regression test отдельно воспроизвёл drag вниз на верхней границе пустого чата: стандартного `keyboardDismissBehavior.onDrag` оказалось недостаточно. Исправлен общий обработчик ScrollStart/Overscroll; полный финальный прогон — 56 passed.
