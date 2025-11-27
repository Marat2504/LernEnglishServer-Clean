# Документация API для функционала ИИ-ассистента

## Обзор

Все эндпоинты находятся по пути `/api/chat/...` и требуют аутентификации (Bearer токен).

---

## 1. Создание нового диалога

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
  "languageLevel": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "deletedAt": null
}
```

---

## 2. Получение диалога с сообщениями

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

## 3. Добавление сообщения в диалог

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

## 4. Отправка сообщения и получение ответа ИИ (стандартный режим)

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

## 5. Отправка сообщения с коррекцией ошибок

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
