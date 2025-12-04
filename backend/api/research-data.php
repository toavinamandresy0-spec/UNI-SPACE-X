<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../config/database.php';
require_once '../config/constants.php';
require_once '../models/ResearchDataModel.php';
require_once '../middleware/AuthMiddleware.php';
require_once '../utils/ResponseHandler.php';
require_once '../utils/DataValidator.php';

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $database = new DatabaseConfig();
    $db = $database->getConnection();
    
    $researchDataModel = new ResearchDataModel($db);
    $auth = new AuthMiddleware($db);
    $responseHandler = new ResponseHandler();
    $validator = new DataValidator();

    $userData = $auth->authenticate();
    
    $method = $_SERVER['REQUEST_METHOD'];
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $pathSegments = explode('/', trim($path, '/'));

    switch ($method) {
        case 'GET':
            // Récupérer des données de recherche avec filtres
            $simulationId = $_GET['simulation_id'] ?? null;
            $dataType = $_GET['data_type'] ?? null;
            $startDate = $_GET['start_date'] ?? null;
            $endDate = $_GET['end_date'] ?? null;
            $limit = min(1000, max(1, $_GET['limit'] ?? 100));
            $offset = max(0, $_GET['offset'] ?? 0);
            
            $filters = [
                'simulation_id' => $simulationId,
                'data_type' => $dataType,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'user_id' => $userData['user_id']
            ];
            
            $researchData = $researchDataModel->getResearchData($filters, $limit, $offset);
            $totalCount = $researchDataModel->getResearchDataCount($filters);
            
            $responseHandler->sendSuccess([
                'data' => $researchData,
                'total_count' => $totalCount,
                'limit' => $limit,
                'offset' => $offset
            ]);
            break;

        case 'POST':
            // Ajouter de nouvelles données de recherche
            $input = json_decode(file_get_contents('php://input'), true);
            
            $validationRules = [
                'simulation_id' => ['required', 'integer'],
                'data_type' => ['required', 'string'],
                'data_values' => ['required', 'array'],
                'timestamp' => ['date']
            ];
            
            if (!$validator->validate($input, $validationRules)) {
                $responseHandler->sendError('Données invalides: ' . implode(', ', $validator->getErrors()), API_VALIDATION_ERROR);
            }
            
            $researchData = [
                'simulation_id' => $input['simulation_id'],
                'data_type' => $input['data_type'],
                'data_values' => json_encode($input['data_values']),
                'timestamp' => $input['timestamp'] ?? date('Y-m-d H:i:s'),
                'user_id' => $userData['user_id']
            ];
            
            $dataId = $researchDataModel->addResearchData($researchData);
            
            if ($dataId) {
                $responseHandler->sendSuccess([
                    'id' => $dataId,
                    'message' => 'Données de recherche ajoutées avec succès'
                ], 201);
            } else {
                $responseHandler->sendError('Erreur lors de l\'ajout des données', API_SERVER_ERROR);
            }
            break;

        default:
            $responseHandler->sendError('Méthode non autorisée', API_METHOD_NOT_ALLOWED);
            break;
    }

} catch (Exception $e) {
    error_log("Research Data API Error: " . $e->getMessage());
    $responseHandler->sendError('Erreur interne du serveur', API_SERVER_ERROR);
}
?>