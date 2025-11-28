# Документация API для функционала ИИ-ассистента

## Обзор

Все эндпоинты находятся по пути `/api/chat/...` и требуют аутентификации (Bearer токен).

---

## 1. Получение списка диалогов пользователя

**Эндпоинт:** `GET /api/chat/dialogs/{userId}?page=1&limit=20`

**Назначение:** Получает список всех диалогов пользователя для выбора активного чата.

**Параметры запроса:**

- `page` (число, по умолчанию 1) - номер страницы
- `limit` (число, по умолчанию 20, ограничение 5-50) - количество диалогов на страницу

**Пример запроса:**

```bash
curl -X GET "http://localhost:3000/api/chat/dialogs/123e4567-e89b-12d3-a456-426614174000?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Пример ответа (200 OK):**

```json
{
  "dialogs": [
    {
      "id": "dialog-uuid-1",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "topic": "Обсуждение путешествий",
      "difficulty": "B1",
      "languageLevel": "B1",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T11:45:00.000Z",
      "deletedAt": null,
      "messageCount": 25
    },
    {
      "id": "dialog-uuid-2",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "topic": "Рабочие темы",
      "difficulty": "C1",
      "languageLevel": "C1",
      "createdAt": "2024-01-14T09:15:00.000Z",
      "updatedAt": "2024-01-14T10:20:00.000Z",
      "deletedAt": null,
      "messageCount": 12
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

**Использование в UI:**

- Загружается при открытии списка чатов
- Диалоги отсортированы по времени последнего обновления (свежие сверху)
- `messageCount` показывает количество сообщений в диалоге

---

## 2. Создание нового диалога

**Эндпоинт:** `POST /api/chat/dialog`

**Назначение:** Создает новый чат-диалог для общения с ИИ-ассистентом.

**Тело запроса:**

```json
{
  "userId": "uuid-пользователя",
  "topic": "Тема разговора (опционально)",
  "difficulty": "A1-C2 (опционально)"
}
```

**Пример запроса:**

```bash
curl -X POST http://localhost:3000/api/chat/dialog \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "topic": "Обсуждение путешествий",
    "difficulty": "B1"
  }'
```

**Пример ответа (201 Created):**

```json
{
  "id": "dialog-uuid",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "topic": "Обсуждение путешествий",
  "difficulty": "B1",
  "languageLevel": "B1",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "deletedAt": null
}
```

---

## 2. Обновление параметров диалога

**Эндпоинт:** `PUT /api/chat/dialog/{id}`

**Назначение:** Позволяет обновить параметры существующего диалога. Все поля опциональны - можно обновить только нужные параметры (тему, уровень сложности или уровень языка).

**Параметры пути:**

- `id` (строка, обязательный) - UUID диалога для обновления

**Тело запроса:**

```json
{
  "topic": "Новая тема диалога (опционально)",
  "difficulty": "A1-C2 (опционально)",
  "languageLevel": "A1-C2 (опционально)"
}
```

**Пример запроса:**

```bash
curl -X PUT http://localhost:3000/api/chat/dialog/dialog-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Бизнес английский",
    "difficulty": "B2",
    "languageLevel": "B2"
  }'
```

**Пример ответа (200 OK):**

```json
{
  "id": "dialog-uuid",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "topic": "Бизнес английский",
  "difficulty": "B2",
  "languageLevel": "B2",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:45:00.000Z",
  "deletedAt": null
}
```

**Пример ответа при ошибке (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Диалог с ID dialog-uuid не найден",
  "error": "Not Found"
}
```

**Использование в UI:**

- Форма редактирования параметров диалога в настройках чата
- Возможность изменить тему разговора в процессе общения
- Корректировка уровня сложности или языка пользователя
- Обновление отображается сразу в интерфейсе

**Особенности:**

- Частичное обновление: можно отправить только те поля, которые нужно изменить
- Автоматическая установка `updatedAt` при любом изменении
- Валидация: проверка существования диалога перед обновлением
- Изменение `languageLevel` влияет на будущие ответы ИИ в этом диалоге

---

## 4. Получение диалога с сообщениями

**Эндпоинт:** `GET /api/chat/dialog/{id}?page=1&limit=50`

**Назначение:** Получает информацию о диалоге и сообщения с пагинацией для отображения в чате.

**Параметры запроса:**

- `page` (число, по умолчанию 1) - номер страницы
- `limit` (число, по умолчанию 50, ограничение 10-100) - количество сообщений на страницу

**Пример запроса:**

```bash
curl -X GET "http://localhost:3000/api/chat/dialog/dialog-uuid?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Пример ответа (200 OK):**

```json
{
  "id": "dialog-uuid",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "topic": "Обсуждение путешествий",
  "difficulty": "B1",
  "languageLevel": "B1",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "deletedAt": null,
  "messages": [
    {
      "id": "msg-uuid-2",
      "dialogId": "dialog-uuid",
      "sender": "AI",
      "text": "Hi! I'm doing well, thank you. How about you?",
      "audioUrl": null,
      "correction": null,
      "explanation": null,
      "createdAt": "2024-01-15T10:31:05.000Z"
    },
    {
      "id": "msg-uuid-1",
      "dialogId": "dialog-uuid",
      "sender": "USER",
      "text": "Hello, how are you?",
      "audioUrl": null,
      "correction": "Hello, how are you?",
      "explanation": "Предложение grammatically correct.",
      "createdAt": "2024-01-15T10:31:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Использование в UI:**

- Для начальной загрузки чата: `page=1&limit=20` (получаем самые свежие сообщения)
- При прокрутке вверх: увеличиваем `page` (page=2, page=3...) для загрузки более старых сообщений
- Сообщения возвращаются от новых к старым (последние сообщения в начале массива)

---

## 5. Добавление сообщения в диалог

**Эндпоинт:** `POST /api/chat/dialog/{id}/message`

**Назначение:** Добавляет новое сообщение в существующий диалог (используется редко, обычно через send эндпоинты).

**Тело запроса:**

```json
{
  "dialogId": "uuid-диалога",
  "sender": "USER или AI",
  "text": "Текст сообщения",
  "audioUrl": "https://example.com/audio.mp3 (опционально)",
  "correction": "Исправленный текст (опционально)",
  "explanation": "Объяснение ошибки (опционально)"
}
```

---

## 6. Отправка сообщения и получение ответа ИИ (стандартный режим)

**Эндпоинт:** `POST /api/chat/dialog/{id}/message/send`

**Назначение:** Основной эндпоинт для общения с ИИ. Пользователь отправляет сообщение, система:

1. Сохраняет сообщение пользователя
2. Отправляет запрос к Blackbox.ai с контекстом из 5 последних сообщений
3. Сохраняет и возвращает ответ ИИ

**Тело запроса:**

```json
{
  "text": "Hello, I want to practice English conversation"
}
```

**Пример запроса:**

```bash
curl -X POST http://localhost:3000/api/chat/dialog/dialog-uuid/message/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, I want to practice English conversation"}'
```

**Пример ответа (201 Created):**

```json
{
  "userMessage": {
    "id": "user-msg-uuid",
    "dialogId": "dialog-uuid",
    "sender": "USER",
    "text": "Hello, I want to practice English conversation",
    "audioUrl": null,
    "correction": null,
    "explanation": null,
    "createdAt": "2024-01-15T10:32:00.000Z"
  },
  "aiMessage": {
    "id": "ai-msg-uuid",
    "dialogId": "dialog-uuid",
    "sender": "AI",
    "text": "Hello! That's great that you want to practice English conversation. What topic would you like to talk about? We can discuss travel, hobbies, work, or anything else you're interested in.",
    "audioUrl": null,
    "correction": null,
    "explanation": null,
    "createdAt": "2024-01-15T10:32:05.000Z"
  }
}
```

**Особенности:**

- ИИ адаптирует язык под уровень пользователя (если указан в диалоге)
- Использует контекст из 5 последних сообщений
- Сообщения возвращаются сразу для отображения в UI

---

## 7. Отправка сообщения с коррекцией ошибок

**Эндпоинт:** `POST /api/chat/dialog/{id}/message/send-with-correction`

**Назначение:** Расширенный режим общения с автоматической проверкой и исправлением грамматических ошибок. Система:

1. Проверяет сообщение пользователя через отдельный AI-промпт
2. Исправляет ошибки и дает объяснение на русском языке
3. Сохраняет оригинальное сообщение с полями `correction` и `explanation`
4. Генерирует обычный ответ ИИ (без коррекции в контенте)

**Тело запроса:**

```json
{
  "text": "I goed to school yesterday and eat apple"
}
```

**Пример запроса:**

```bash
curl -X POST http://localhost:3000/api/chat/dialog/dialog-uuid/message/send-with-correction \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "I goed to school yesterday and eat apple"}'
```

**Пример ответа (201 Created):**

```json
{
  "userMessage": {
    "id": "user-msg-uuid",
    "dialogId": "dialog-uuid",
    "sender": "USER",
    "text": "I goed to school yesterday and eat apple",
    "audioUrl": null,
    "correction": "I went to school yesterday and ate an apple",
    "explanation": "Ошибки в сообщении:\n1. 'goed' → 'went' (прошедшее время глагола 'go')\n2. 'eat' → 'ate' (прошедшее время глагола 'eat')\n3. Добавлен артикль 'an' перед 'apple'",
    "createdAt": "2024-01-15T10:33:00.000Z"
  },
  "aiMessage": {
    "id": "ai-msg-uuid",
    "dialogId": "dialog-uuid",
    "sender": "AI",
    "text": "That sounds like a nice day! Did you learn anything interesting at school?",
    "audioUrl": null,
    "correction": null,
    "explanation": null,
    "createdAt": "2024-01-15T10:33:05.000Z"
  },
  "correction": {
    "correctedText": "I went to school yesterday and ate an apple",
    "explanation": "Ошибки в сообщении:\n1. 'goed' → 'went' (прошедшее время глагола 'go')\n2. 'eat' → 'ate' (прошедшее время глагола 'eat')\n3. Добавлен артикль 'an' перед 'apple'"
  }
}
```

**Особенности:**

- Коррекция происходит на русском языке
- Оригинальный текст сохраняется в `text`, исправление в `correction`
- ИИ-ответ генерируется без учета исправлений (чтобы не путать пользователя)
- Для контекста используются только сообщения без полей `correction` (чтобы избежать дублирования)

---

## 8. Удаление диалога со всеми сообщениями

**Эндпоинт:** `DELETE /api/chat/dialog/{id}`

**Назначение:** Полностью удаляет диалог и все связанные с ним сообщения из базы данных. Операция необратима.

**Параметры пути:**

- `id` (строка, обязательный) - UUID диалога для удаления

**Пример запроса:**

```bash
curl -X DELETE http://localhost:3000/api/chat/dialog/dialog-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Пример ответа (200 OK):**

```json
{
  "message": "Диалог успешно удален со всеми сообщениями"
}
```

**Пример ответа при ошибке (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Диалог с ID dialog-uuid не найден",
  "error": "Not Found"
}
```

**Использование в UI:**

- Кнопка "Удалить диалог" в настройках чата
- Требует подтверждения от пользователя перед выполнением
- После успешного удаления перенаправить пользователя на список диалогов
- Обновить список диалогов, удалив удаленный элемент

**Особенности:**

- Каскадное удаление: автоматически удаляет все сообщения диалога
- Проверка существования: возвращает ошибку 404, если диалог не найден
- Безопасность: только владелец диалога может его удалить (проверка через JWT)

---

## Рекомендации для UI-разработчиков

### Структура чата:

1. **Начальная загрузка:** `GET /dialog/{id}?page=1&limit=20`
2. **Отправка сообщений:** `POST /dialog/{id}/message/send` или `send-with-correction`
3. **Прокрутка вверх:** `GET /dialog/{id}?page=2&limit=20` и т.д.

### Отображение сообщений:

- **USER:** Показывать `text`, если есть `correction` - показывать подсказку
- **AI:** Показывать `text`
- **Цвета:** Разные цвета для пользователя и ИИ
- **Время:** Показывать `createdAt` в читаемом формате

### Обработка ошибок:

- Все эндпоинты возвращают стандартные HTTP статусы
- При ошибках API возвращается сообщение на русском языке
- Обязательно обрабатывать сетевые ошибки

### Производительность:

- Кэшировать загруженные сообщения
- Использовать пагинацию для больших диалогов
- Lazy loading при прокрутке вверх

### Безопасность:

- Все запросы требуют JWT токен
- Валидация входных данных на сервере
- Ограничения на количество сообщений (10-100 на страницу)
