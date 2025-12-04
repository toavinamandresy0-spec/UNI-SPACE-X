<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../config/database.php';
require_once '../config/constants.php';
require_once '../models/SimulationModel.php';
require_once '../middleware/AuthMiddleware.php';
require_once '../utils/ResponseHandler.php';
require_once '../utils/DataValidator.php';

// Gérer les requêtes preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $database = new DatabaseConfig();
    $db = $database->getConnection();
    
    $simulationModel = new SimulationModel($db);
    $auth = new AuthMiddleware($db);
    $responseHandler = new ResponseHandler();
    $validator = new DataValidator();

    // Vérifier l'authentification
    $userData = $auth->authenticate();
    
    $method = $_SERVER['REQUEST_METHOD'];
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $pathSegments = explode('/', trim($path, '/'));
    
    // Extraire l'ID de simulation si présent
    $simulationId = null;
    if (count($pathSegments) > 2 && is_numeric($pathSegments[2])) {
        $simulationId = (int)$pathSegments[2];
    }

    switch ($method) {
        case 'GET':
            if ($simulationId) {
                // Récupérer une simulation spécifique
                $simulation = $simulationModel->getSimulation($simulationId, $userData['user_id']);
                
                if ($simulation) {
                    // Vérifier les permissions
                    if ($simulation['user_id'] != $userData['user_id'] && 
                        $simulation['access_level'] < $userData['access_level']) {
                        $responseHandler->sendError('Accès non autorisé à cette simulation', API_FORBIDDEN);
                    }
                    
                    $responseHandler->sendSuccess($simulation);
                } else {
                    $responseHandler->sendError('Simulation non trouvée', API_NOT_FOUND);
                }
            } else {
                // Lister les simulations avec pagination et filtres
                $page = max(1, $_GET['page'] ?? 1);
                $limit = min(50, max(1, $_GET['limit'] ?? 20));
                $offset = ($page - 1) * $limit;
                
                $filters = [
                    'type' => $_GET['type'] ?? null,
                    'status' => $_GET['status'] ?? null,
                    'search' => $_GET['search'] ?? null,
                    'start_date' => $_GET['start_date'] ?? null,
                    'end_date' => $_GET['end_date'] ?? null
                ];
                
                $simulations = $simulationModel->getSimulations(
                    $userData['user_id'], 
                    $userData['access_level'],
                    $filters,
                    $limit,
                    $offset
                );
                
                $total = $simulationModel->getSimulationsCount(
                    $userData['user_id'],
                    $userData['access_level'],
                    $filters
                );
                
                $responseHandler->sendSuccess([
                    'simulations' => $simulations,
                    'pagination' => [
                        'page' => $page,
                        'limit' => $limit,
                        'total' => $total,
                        'pages' => ceil($total / $limit)
                    ]
                ]);
            }
            break;

        case 'POST':
            // Créer une nouvelle simulation
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validation des données
            $validationRules = [
                'name' => ['required', 'string', 'max:' . MAX_SIMULATION_NAME_LENGTH],
                'type' => ['required', 'in:' . implode(',', [SIM_TYPE_ORBITAL, SIM_TYPE_QUANTUM, SIM_TYPE_LAUNCH, SIM_TYPE_INTERSTELLAR])],
                'parameters' => ['required', 'array'],
                'description' => ['string', 'max:' . MAX_DESCRIPTION_LENGTH]
            ];
            
            if (!$validator->validate($input, $validationRules)) {
                $responseHandler->sendError('Données invalides: ' . implode(', ', $validator->getErrors()), API_VALIDATION_ERROR);
            }
            
            $simulationData = [
                'user_id' => $userData['user_id'],
                'name' => $input['name'],
                'type' => $input['type'],
                'parameters' => json_encode($input['parameters']),
                'description' => $input['description'] ?? '',
                'access_level' => $input['access_level'] ?? ACCESS_LEVEL_RESEARCHER,
                'status' => SIM_STATUS_DRAFT
            ];
            
            $newSimulationId = $simulationModel->createSimulation($simulationData);
            
            if ($newSimulationId) {
                $responseHandler->sendSuccess([
                    'id' => $newSimulationId,
                    'message' => 'Simulation créée avec succès'
                ], 201);
            } else {
                $responseHandler->sendError('Erreur lors de la création de la simulation', API_SERVER_ERROR);
            }
            break;

        case 'PUT':
            if (!$simulationId) {
                $responseHandler->sendError('ID de simulation requis', API_BAD_REQUEST);
            }
            
            // Mettre à jour une simulation
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Vérifier que l'utilisateur peut modifier cette simulation
            $existingSimulation = $simulationModel->getSimulation($simulationId, $userData['user_id']);
            if (!$existingSimulation || $existingSimulation['user_id'] != $userData['user_id']) {
                $responseHandler->sendError('Modification non autorisée', API_FORBIDDEN);
            }
            
            $updateData = [];
            $allowedFields = ['name', 'description', 'parameters', 'access_level'];
            
            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updateData[$field] = $input[$field];
                }
            }
            
            if (isset($updateData['parameters'])) {
                $updateData['parameters'] = json_encode($updateData['parameters']);
            }
            
            if ($simulationModel->updateSimulation($simulationId, $updateData)) {
                $responseHandler->sendSuccess(['message' => 'Simulation mise à jour avec succès']);
            } else {
                $responseHandler->sendError('Erreur lors de la mise à jour', API_SERVER_ERROR);
            }
            break;

        case 'DELETE':
            if (!$simulationId) {
                $responseHandler->sendError('ID de simulation requis', API_BAD_REQUEST);
            }
            
            // Supprimer une simulation
            $existingSimulation = $simulationModel->getSimulation($simulationId, $userData['user_id']);
            if (!$existingSimulation || $existingSimulation['user_id'] != $userData['user_id']) {
                $responseHandler->sendError('Suppression non autorisée', API_FORBIDDEN);
            }
            
            if ($simulationModel->deleteSimulation($simulationId)) {
                $responseHandler->sendSuccess(['message' => 'Simulation supprimée avec succès']);
            } else {
                $responseHandler->sendError('Erreur lors de la suppression', API_SERVER_ERROR);
            }
            break;

        default:
            $responseHandler->sendError('Méthode non autorisée', API_METHOD_NOT_ALLOWED);
            break;
    }

} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    $responseHandler->sendError('Erreur interne du serveur', API_SERVER_ERROR);
}
?>