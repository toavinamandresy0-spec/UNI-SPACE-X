<?php
require_once 'vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Dompdf\Dompdf;
use Dompdf\Options;

class FileExporter {
    private $db;
    private $exportModel;

    public function __construct($db = null) {
        $this->db = $db;
        if ($db) {
            $this->exportModel = new ExportModel($db);
        }
    }

    public function generateExport($exportId, $exportData) {
        try {
            // Créer le répertoire d'export s'il n'existe pas
            $this->ensureExportDirectory();
            
            $filename = "export_{$exportId}_" . date('Y-m-d_H-i-s');
            $fileExtension = $exportData['export_type'];
            
            $fullPath = EXPORT_BASE_PATH . $filename . '.' . $fileExtension;
            
            // Générer le fichier selon le type
            switch ($exportData['export_type']) {
                case EXPORT_CSV:
                    $result = $this->generateCSV($exportData, $fullPath);
                    break;
                    
                case EXPORT_JSON:
                    $result = $this->generateJSON($exportData, $fullPath);
                    break;
                    
                case EXPORT_XML:
                    $result = $this->generateXML($exportData, $fullPath);
                    break;
                    
                case EXPORT_PDF:
                    $result = $this->generatePDF($exportData, $fullPath);
                    break;
                    
                case EXPORT_EXCEL:
                    $result = $this->generateExcel($exportData, $fullPath);
                    break;
                    
                default:
                    throw new Exception("Type d'export non supporté: " . $exportData['export_type']);
            }
            
            if ($result['success']) {
                // Mettre à jour la base de données
                if ($this->exportModel) {
                    $this->exportModel->updateExportFile($exportId, $filename . '.' . $fileExtension, $result['file_size']);
                }
                
                return [
                    'success' => true,
                    'file_url' => $fullPath,
                    'file_size' => $result['file_size']
                ];
            } else {
                throw new Exception($result['error']);
            }
            
        } catch (Exception $e) {
            error_log("Export generation error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    private function generateCSV($exportData, $filePath) {
        $data = $this->fetchExportData($exportData);
        
        if (empty($data)) {
            throw new Exception("Aucune donnée à exporter");
        }
        
        $file = fopen($filePath, 'w');
        
        if (!$file) {
            throw new Exception("Impossible de créer le fichier CSV");
        }
        
        // Écrire l'en-tête
        $headers = array_keys($data[0]);
        fputcsv($file, $headers, ';');
        
        // Écrire les données
        foreach ($data as $row) {
            fputcsv($file, $row, ';');
        }
        
        fclose($file);
        
        return [
            'success' => true,
            'file_size' => filesize($filePath)
        ];
    }

    private function generateJSON($exportData, $filePath) {
        $data = $this->fetchExportData($exportData);
        
        $exportStructure = [
            'metadata' => $this->generateMetadata($exportData),
            'exported_at' => date('c'),
            'data_count' => count($data),
            'data' => $data
        ];
        
        $jsonContent = json_encode($exportStructure, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
        if (file_put_contents($filePath, $jsonContent) === false) {
            throw new Exception("Impossible d'écrire le fichier JSON");
        }
        
        return [
            'success' => true,
            'file_size' => filesize($filePath)
        ];
    }

    private function generateXML($exportData, $filePath) {
        $data = $this->fetchExportData($exportData);
        
        $xml = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><export></export>');
        
        // Métadonnées
        $metadata = $xml->addChild('metadata');
        $metadata->addChild('exported_at', date('c'));
        $metadata->addChild('data_count', count($data));
        $metadata->addChild('export_type', $exportData['data_type']);
        
        // Données
        $dataNode = $xml->addChild('data');
        foreach ($data as $item) {
            $itemNode = $dataNode->addChild('item');
            $this->arrayToXML($item, $itemNode);
        }
        
        if ($xml->asXML($filePath) === false) {
            throw new Exception("Impossible d'écrire le fichier XML");
        }
        
        return [
            'success' => true,
            'file_size' => filesize($filePath)
        ];
    }

    private function generatePDF($exportData, $filePath) {
        $data = $this->fetchExportData($exportData);
        
        $options = new Options();
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', true);
        
        $dompdf = new Dompdf($options);
        
        $html = $this->generatePDFHTML($exportData, $data);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
        
        $output = $dompdf->output();
        
        if (file_put_contents($filePath, $output) === false) {
            throw new Exception("Impossible d'écrire le fichier PDF");
        }
        
        return [
            'success' => true,
            'file_size' => filesize($filePath)
        ];
    }

    private function generateExcel($exportData, $filePath) {
        $data = $this->fetchExportData($exportData);
        
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // En-têtes
        if (!empty($data)) {
            $headers = array_keys($data[0]);
            $column = 'A';
            foreach ($headers as $header) {
                $sheet->setCellValue($column . '1', $header);
                $column++;
            }
            
            // Données
            $row = 2;
            foreach ($data as $item) {
                $column = 'A';
                foreach ($item as $value) {
                    $sheet->setCellValue($column . $row, $value);
                    $column++;
                }
                $row++;
            }
        }
        
        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);
        
        return [
            'success' => true,
            'file_size' => filesize($filePath)
        ];
    }

    private function fetchExportData($exportData) {
        // Implémentation de récupération des données depuis la base
        // Cette fonction devrait être adaptée selon le type de données demandé
        
        $researchDataModel = new ResearchDataModel($this->db);
        $simulationModel = new SimulationModel($this->db);
        
        $filters = json_decode($exportData['filters'], true) ?? [];
        
        switch ($exportData['data_type']) {
            case 'simulation_data':
                return $this->fetchSimulationData($exportData['simulation_id'], $filters);
                
            case 'research_data':
                return $researchDataModel->getResearchData($filters, 10000, 0);
                
            case 'simulation_parameters':
                $simulation = $simulationModel->getSimulation($exportData['simulation_id'], $exportData['user_id']);
                return [$simulation['parameters'] ?? []];
                
            default:
                return [];
        }
    }

    private function fetchSimulationData($simulationId, $filters) {
        // Implémentation spécifique pour les données de simulation
        $query = "SELECT * FROM research_data WHERE simulation_id = :simulation_id";
        
        if (!empty($filters['start_date'])) {
            $query .= " AND timestamp >= :start_date";
        }
        
        if (!empty($filters['end_date'])) {
            $query .= " AND timestamp <= :end_date";
        }
        
        if (!empty($filters['data_type'])) {
            $query .= " AND data_type = :data_type";
        }
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":simulation_id", $simulationId);
        
        if (!empty($filters['start_date'])) {
            $stmt->bindParam(":start_date", $filters['start_date']);
        }
        
        if (!empty($filters['end_date'])) {
            $stmt->bindParam(":end_date", $filters['end_date']);
        }
        
        if (!empty($filters['data_type'])) {
            $stmt->bindParam(":data_type", $filters['data_type']);
        }
        
        if ($stmt->execute()) {
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        return [];
    }

    private function generateMetadata($exportData) {
        return [
            'export_id' => $exportData['export_id'] ?? null,
            'user_id' => $exportData['user_id'],
            'export_type' => $exportData['export_type'],
            'data_type' => $exportData['data_type'],
            'simulation_id' => $exportData['simulation_id'],
            'filters' => json_decode($exportData['filters'], true),
            'created_at' => date('c')
        ];
    }

    private function generatePDFHTML($exportData, $data) {
        $metadata = $this->generateMetadata($exportData);
        
        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>Export de Données</title>
            <style>
                body { font-family: DejaVu Sans, sans-serif; margin: 20px; }
                .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .metadata { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <div class='header'>
                <h1>Export de Données de Recherche Spatiale</h1>
                <p>Généré le " . date('d/m/Y à H:i:s') . "</p>
            </div>
            
            <div class='metadata'>
                <h3>Métadonnées</h3>
                <p><strong>Type d'export:</strong> " . $metadata['export_type'] . "</p>
                <p><strong>Type de données:</strong> " . $metadata['data_type'] . "</p>
                <p><strong>ID Simulation:</strong> " . ($metadata['simulation_id'] ?? 'N/A') . "</p>
                <p><strong>Nombre d'enregistrements:</strong> " . count($data) . "</p>
            </div>
        ";
        
        if (!empty($data)) {
            $html .= "<h3>Données</h3><table>";
            
            // En-têtes
            $html .= "<tr>";
            foreach (array_keys($data[0]) as $header) {
                $html .= "<th>" . htmlspecialchars($header) . "</th>";
            }
            $html .= "</tr>";
            
            // Données
            foreach ($data as $row) {
                $html .= "<tr>";
                foreach ($row as $cell) {
                    $html .= "<td>" . htmlspecialchars(is_array($cell) ? json_encode($cell) : $cell) . "</td>";
                }
                $html .= "</tr>";
            }
            
            $html .= "</table>";
        }
        
        $html .= "</body></html>";
        
        return $html;
    }

    private function arrayToXML($array, $parent) {
        foreach ($array as $key => $value) {
            if (is_array($value)) {
                $child = $parent->addChild($key);
                $this->arrayToXML($value, $child);
            } else {
                $parent->addChild($key, htmlspecialchars($value));
            }
        }
    }

    private function ensureExportDirectory() {
        $subdirs = ['csv', 'json', 'xml', 'pdf', 'xlsx'];
        
        foreach ($subdirs as $subdir) {
            $dir = EXPORT_BASE_PATH . $subdir;
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }

    public function processLargeExport($exportId, $exportData) {
        // Cette fonction est conçue pour être exécutée en arrière-plan
        // via un cron job ou une queue de traitement
        
        try {
            $result = $this->generateExport($exportId, $exportData);
            
            if (!$result['success']) {
                $this->exportModel->updateExportStatus($exportId, 'failed', $result['error']);
            }
            
        } catch (Exception $e) {
            $this->exportModel->updateExportStatus($exportId, 'failed', $e->getMessage());
        }
    }
}
?>