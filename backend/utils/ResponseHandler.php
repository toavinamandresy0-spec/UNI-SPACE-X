<?php
class ResponseHandler {
    
    public function sendSuccess($data = null, $statusCode = API_SUCCESS) {
        http_response_code($statusCode);
        
        $response = [
            'success' => true,
            'timestamp' => date('c'),
            'data' => $data
        ];
        
        echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    public function sendError($message, $statusCode = API_SERVER_ERROR, $details = null) {
        http_response_code($statusCode);
        
        $response = [
            'success' => false,
            'error' => [
                'code' => $statusCode,
                'message' => $message,
                'timestamp' => date('c')
            ]
        ];
        
        if ($details !== null) {
            $response['error']['details'] = $details;
        }
        
        // En mode debug, ajouter des informations de débogage
        if (defined('APP_DEBUG') && APP_DEBUG) {
            $response['debug'] = [
                'file' => debug_backtrace()[0]['file'] ?? null,
                'line' => debug_backtrace()[0]['line'] ?? null
            ];
        }
        
        echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    public function sendValidationError($errors) {
        $this->sendError(
            'Erreur de validation des données', 
            API_VALIDATION_ERROR, 
            $errors
        );
    }
    
    public function sendPaginatedResponse($data, $pagination) {
        $response = [
            'success' => true,
            'data' => $data,
            'pagination' => $pagination,
            'timestamp' => date('c')
        ];
        
        echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    public function sendFileResponse($filePath, $filename = null) {
        if (!file_exists($filePath)) {
            $this->sendError('Fichier non trouvé', API_NOT_FOUND);
        }
        
        $filename = $filename ?: basename($filePath);
        $fileSize = filesize($filePath);
        $mimeType = $this->getMimeType($filePath);
        
        header('Content-Type: ' . $mimeType);
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . $fileSize);
        
        readfile($filePath);
        exit;
    }
    
    private function getMimeType($filePath) {
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        
        $mimeTypes = [
            'csv' => 'text/csv',
            'json' => 'application/json',
            'xml' => 'application/xml',
            'pdf' => 'application/pdf',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'zip' => 'application/zip'
        ];
        
        return $mimeTypes[$extension] ?? 'application/octet-stream';
    }
    
    public function setCORSHeaders($allowedOrigins = []) {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        if (in_array($origin, $allowedOrigins) || in_array('*', $allowedOrigins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }
        
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');
    }
    
    public function handleOptionsRequest() {
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }
}
?>