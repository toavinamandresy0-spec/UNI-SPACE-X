<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../config/database.php';
require_once '../config/constants.php';
require_once '../models/ExportModel.php';
require_once '../middleware/AuthMiddleware.php';
require_once '../utils/ResponseHandler.php';
require_once '../utils/DataValidator.php';
require_once '../utils/FileExporter.php';

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $database = new DatabaseConfig();
    $db = $database->getConnection();
    
    $exportModel = new ExportModel($db);
    $auth = new AuthMiddleware($db);
    $responseHandler = new ResponseHandler();
    $validator = new DataValidator();
    $fileExporter = new FileExporter();

    $userData = $auth->authenticate();
    
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            // Télécharger un export existant
            $exportId = $_GET['export_id'] ?? null;
            $download = $_GET['download'] ?? true;
            
            if (!$exportId) {
                $responseHandler->sendError('ID d\'export requis', API_BAD_REQUEST);
            }
            
            $export = $exportModel->getExport($exportId, $userData['user_id']);
            
            if (!$export) {
                $responseHandler->sendError('Export non trouvé', API_NOT_FOUND);
            }
            
            $filePath = EXPORT_BASE_PATH . $export['file_path'];
            
            if (!file_exists($filePath)) {
                $responseHandler->sendError('Fichier d\'export introuvable', API_NOT_FOUND);
            }
            
            if ($download) {
                // Forcer le téléchargement
                header('Content-Description: File Transfer');
                header('Content-Type: application/octet-stream');
                header('Content-Disposition: attachment; filename="' . basename($filePath) . '"');
                header('Expires: 0');
                header('Cache-Control: must-revalidate');
                header('Pragma: public');
                header('Content-Length: ' . filesize($filePath));
                readfile($filePath);
                exit;
            } else {
                // Retourner les informations de l'export
                $responseHandler->sendSuccess($export);
            }
            break;

        case 'POST':
            // Créer un nouvel export
            $input = json_decode(file_get_contents('php://input'), true);
            
            $validationRules = [
                'export_type' => ['required', 'in:' . implode(',', [EXPORT_CSV, EXPORT_JSON, EXPORT_XML, EXPORT_PDF, EXPORT_EXCEL])],
                'data_type' => ['required', 'string'],
                'filters' => ['array'],
                'simulation_id' => ['integer'],
                'include_metadata' => ['boolean']
            ];
            
            if (!$validator->validate($input, $validationRules)) {
                $responseHandler->sendError('Données d\'export invalides', API_VALIDATION_ERROR);
            }
            
            // Préparer les données pour l'export
            $exportData = [
                'user_id' => $userData['user_id'],
                'export_type' => $input['export_type'],
                'data_type' => $input['data_type'],
                'filters' => json_encode($input['filters'] ?? []),
                'simulation_id' => $input['simulation_id'] ?? null,
                'include_metadata' => $input['include_metadata'] ?? true,
                'status' => 'pending'
            ];
            
            // Créer l'enregistrement d'export
            $exportId = $exportModel->createExport($exportData);
            
            if (!$exportId) {
                $responseHandler->sendError('Erreur lors de la création de l\'export', API_SERVER_ERROR);
            }
            
            // Traitement asynchrone pour les gros exports
            if ($input['data_type'] == 'simulation_data' && ($input['filters']['date_range'] ?? false)) {
                // Retourner immédiatement pour les gros exports
                $responseHandler->sendSuccess([
                    'export_id' => $exportId,
                    'status' => 'processing',
                    'message' => 'Export en cours de traitement en arrière-plan'
                ]);
                
                // Lancer le traitement en arrière-plan
                $fileExporter->processLargeExport($exportId, $exportData);
            } else {
                // Traitement synchrone pour les petits exports
                $result = $fileExporter->generateExport($exportId, $exportData);
                
                if ($result['success']) {
                    $responseHandler->sendSuccess([
                        'export_id' => $exportId,
                        'file_url' => $result['file_url'],
                        'file_size' => $result['file_size'],
                        'message' => 'Export généré avec succès'
                    ]);
                } else {
                    $exportModel->updateExportStatus($exportId, 'failed', $result['error']);
                    $responseHandler->sendError('Erreur lors de la génération de l\'export: ' . $result['error'], API_SERVER_ERROR);
                }
            }
            break;

        default:
            $responseHandler->sendError('Méthode non autorisée', API_METHOD_NOT_ALLOWED);
            break;
    }

} catch (Exception $e) {
    error_log("Export API Error: " . $e->getMessage());
    $responseHandler->sendError('Erreur interne du serveur', API_SERVER_ERROR);
}
?>