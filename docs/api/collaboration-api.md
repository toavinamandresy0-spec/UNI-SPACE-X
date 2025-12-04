 # Documentation de l'API de collaboration

Ce document décrit les endpoints exposés par `backend/api/collaboration.php` pour gérer les sessions de collaboration, les participants et les messages. Les exemples ci-dessous montrent les formats d'appel (JSON) et des fragments clients en `curl`, JavaScript (fetch) et PHP.

**Base URL**: `/backend/api/collaboration.php`

**Headers communs**:
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (JWT ou autre token d'authentification géré par `AuthMiddleware`)

---

## Endpoints

1) GET?action=list

- Description: Récupère la liste des sessions de collaboration accessibles à l'utilisateur connecté.
- Query params: none
- Response: 200 { sessions: [ { session_id, name, created_by, participant_count, last_activity, ... } ] }

Exemple curl:

```bash
curl -H "Authorization: Bearer $TOKEN" \
	"https://example.org/backend/api/collaboration.php?action=list"
```

2) GET?action=participants&session_id={id}

- Description: Liste les participants d'une session.
Exécuter tests pertinents (4/6)
4 files changed
+469
-3
Keep
Undo
collaboration-api.md
:23-29

- Query params: `session_id` (required)
- Response: 200 { participants: [ { user_id, first_name, last_name, email, role, joined_at } ] }

Exemple curl:

```bash
curl -H "Authorization: Bearer $TOKEN" \
	"https://example.org/backend/api/collaboration.php?action=participants&session_id=42"
```

3) GET?action=messages&session_id={id}&limit={n}&offset={n}

- Description: Récupère les messages d'une session (ordre décroissant par date).
- Query params: `session_id` (required), `limit` (optional, default 50, max 100), `offset` (optional)
- Response: 200 { messages: [ { message_id, session_id, user_id, message, message_type, metadata, created_at, first_name, last_name } ] }

4) POST (create_session)

- Description: Crée une nouvelle session de collaboration.
- Body JSON:
	- `action`: `create_session` (optionnel si endpoint POST par défaut)
	- `name` (string, required)
	- `simulation_id` (integer, required)
	- `description` (string, optional)
- Response: 201 { session_id, access_code, message }

Exemple curl:

```bash
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
	-d '{"action":"create_session","name":"Collab test","simulation_id":123,"description":"Analyse conjointe"}' \
	"https://example.org/backend/api/collaboration.php"
```

5) POST (join_session)

- Description: Rejoindre une session via `access_code`.
- Body JSON:
	- `action`: `join_session`
	- `access_code`: string (16 hex chars)
- Response: 200 { session_id, message }

6) POST (send_message)

- Description: Envoyer un message dans une session.
- Body JSON:
	- `action`: `send_message`
	- `session_id` (integer, required)
	- `message` (string, required)
	- `message_type` (enum: `text`, `annotation`, `command`, optional)
	- `metadata` (object, optional)
- Response: 200 { message_id, timestamp, message }

Exemple curl:

```bash
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
	-d '{"action":"send_message","session_id":42,"message":"Bonjour équipe","message_type":"text"}' \
	"https://example.org/backend/api/collaboration.php"
```

7) PUT

- Description: Mettre à jour une session (seulement par le créateur).
- Body JSON:
	- `session_id` (integer, required)
	- `name` (string, optional)
	- `description` (string, optional)
	- `is_active` (boolean, optional)
- Response: 200 { message }

8) DELETE

- Description: Quitter une session (supprime le participant actuel).
- Body JSON:
	- `session_id` (integer, required)
- Response: 200 { message }

---

## Exemples clients

JavaScript (fetch) — envoyer un message:

```javascript
async function sendMessage(token, sessionId, text) {
	const res = await fetch('/backend/api/collaboration.php', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + token
		},
		body: JSON.stringify({ action: 'send_message', session_id: sessionId, message: text })
	});
	return res.json();
}
```

PHP (cURL) — rejoindre une session:

```php
$payload = json_encode(['action' => 'join_session', 'access_code' => $code]);
$ch = curl_init('https://example.org/backend/api/collaboration.php');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
	'Content-Type: application/json',
	'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$resp = curl_exec($ch);
curl_close($ch);
$data = json_decode($resp, true);
```

---

## Extraits de code (serveur et client)

Ci-dessous quelques extraits utiles tirés des fichiers serveur et du client JS (`frontend/js/modules/collaboration/CollaborationApiClient.js`) pour comprendre l'implémentation.

### Serveur — gestion POST `create_session` (extrait)

```php
// backend/api/collaboration.php (extrait)
if ($method === 'POST') {
	$action = $input['action'] ?? 'create_session';
	if ($action === 'create_session') {
		// validation simplifiée
		$validationRules = [ 'name' => ['required'], 'simulation_id' => ['required'] ];
		if (!$validator->validate($input, $validationRules)) {
			$responseHandler->sendError('Données invalides', API_VALIDATION_ERROR);
		}

		$sessionData = [
			'name' => $input['name'],
			'simulation_id' => $input['simulation_id'],
			'description' => $input['description'] ?? '',
			'created_by' => $userData['user_id'],
			'access_code' => bin2hex(random_bytes(8))
		];

		$sessionId = $collaborationModel->createCollaborationSession($sessionData);
		if ($sessionId) {
			$responseHandler->sendSuccess(['session_id' => $sessionId, 'access_code' => $sessionData['access_code']], 201);
		} else {
			$responseHandler->sendError('Erreur lors de la création de la session', API_SERVER_ERROR);
		}
	}
}
```

### Serveur — ajout d'un message (extrait)

```php
// backend/api/collaboration.php (extrait pour 'send_message')
$messageData = [
	'session_id' => $input['session_id'],
	'user_id' => $userData['user_id'],
	'message' => $input['message'],
	'message_type' => $input['message_type'] ?? 'text',
	'metadata' => isset($input['metadata']) ? json_encode($input['metadata']) : null
];

$messageId = $collaborationModel->addMessage($messageData);
if ($messageId) {
	$responseHandler->sendSuccess(['message_id' => $messageId, 'timestamp' => date('Y-m-d H:i:s')]);
} else {
	$responseHandler->sendError('Erreur lors de l\'envoi du message', API_SERVER_ERROR);
}
```

### Model — insertion d'un message (extrait)

```php
// backend/models/CollaborationModel.php (extrait)
public function addMessage($messageData) {
	if (!$this->isUserInSession($messageData['session_id'], $messageData['user_id'])) {
		return false;
	}

	$query = "INSERT INTO " . $this->table_messages . " 
			  (session_id, user_id, message, message_type, metadata, created_at) 
			  VALUES (:session_id, :user_id, :message, :message_type, :metadata, NOW())";

	$stmt = $this->conn->prepare($query);
	$stmt->bindParam(":session_id", $messageData['session_id']);
	$stmt->bindParam(":user_id", $messageData['user_id']);
	$stmt->bindParam(":message", $messageData['message']);
	$stmt->bindParam(":message_type", $messageData['message_type']);
	$stmt->bindParam(":metadata", $messageData['metadata']);

	if ($stmt->execute()) {
		$messageId = $this->conn->lastInsertId();
		$this->updateSessionActivity($messageData['session_id']);
		$this->updateParticipantActivity($messageData['session_id'], $messageData['user_id']);
		return $messageId;
	}
	return false;
}
```

### Client JS — utilisation du client `CollaborationApiClient`

```javascript
import CollaborationApiClient from '/frontend/js/modules/collaboration/CollaborationApiClient.js';

const client = new CollaborationApiClient('/backend/api/collaboration.php', async () => localStorage.getItem('authToken'));

// créer une session
await client.createSession({ name: 'Session test', simulation_id: 123 });

// envoyer un message
await client.sendMessage(42, 'Bonjour équipe');

// lister messages
const msgs = await client.getMessages(42, { limit: 20 });
console.log(msgs);
```

Pour voir le code complet côté serveur, consultez `backend/api/collaboration.php` et `backend/models/CollaborationModel.php`.

## Validation et erreurs

- Les erreurs renvoient un JSON standard via `ResponseHandler` : `{ error: 'message' }` et un code HTTP approprié (400, 401, 403, 404, 500...).
- Codes d'erreur internes utilisés dans l'API : `API_BAD_REQUEST`, `API_VALIDATION_ERROR`, `API_FORBIDDEN`, `API_NOT_FOUND`, `API_SERVER_ERROR`, `API_METHOD_NOT_ALLOWED`.

## Sécurité et bonnes pratiques

- Toujours fournir un token valide dans `Authorization` ; `AuthMiddleware` valide le token et renvoie l'utilisateur.
- Limiter la taille des messages côté client et côté serveur (déjà contrôlé par `DataValidator`).
- Pour des échanges temps réel, privilégier WebSocket avec authentification et réconciliation côté serveur (non couvert par ce fichier REST).

---

Pour toute question ou ajout d'exemples (SDK client, WebSocket, WebRTC), ouvrez une issue et je peux ajouter des exemples dédiés.
