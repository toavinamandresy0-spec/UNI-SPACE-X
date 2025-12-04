<?php
class DataValidator {
    private $errors = [];

    public function validate($data, $rules) {
        $this->errors = [];

        foreach ($rules as $field => $fieldRules) {
            $value = $data[$field] ?? null;
            
            foreach ($fieldRules as $rule) {
                if (!$this->checkRule($field, $value, $rule)) {
                    break;
                }
            }
        }

        return empty($this->errors);
    }

    private function checkRule($field, $value, $rule) {
        if ($rule === 'required') {
            if ($value === null || $value === '' || (is_array($value) && empty($value))) {
                $this->errors[$field] = "Le champ $field est requis";
                return false;
            }
            return true;
        }

        if (strpos($rule, 'max:') === 0) {
            $max = (int) substr($rule, 4);
            if (strlen($value) > $max) {
                $this->errors[$field] = "Le champ $field ne doit pas dépasser $max caractères";
                return false;
            }
            return true;
        }

        if (strpos($rule, 'min:') === 0) {
            $min = (int) substr($rule, 4);
            if (strlen($value) < $min) {
                $this->errors[$field] = "Le champ $field doit contenir au moins $min caractères";
                return false;
            }
            return true;
        }

        if (strpos($rule, 'in:') === 0) {
            $allowedValues = explode(',', substr($rule, 3));
            if (!in_array($value, $allowedValues)) {
                $this->errors[$field] = "Le champ $field doit être une des valeurs suivantes: " . implode(', ', $allowedValues);
                return false;
            }
            return true;
        }

        if ($rule === 'email') {
            if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                $this->errors[$field] = "Le champ $field doit être une adresse email valide";
                return false;
            }
            return true;
        }

        if ($rule === 'string') {
            if (!is_string($value)) {
                $this->errors[$field] = "Le champ $field doit être une chaîne de caractères";
                return false;
            }
            return true;
        }

        if ($rule === 'integer') {
            if (!is_numeric($value) || (int)$value != $value) {
                $this->errors[$field] = "Le champ $field doit être un nombre entier";
                return false;
            }
            return true;
        }

        if ($rule === 'numeric') {
            if (!is_numeric($value)) {
                $this->errors[$field] = "Le champ $field doit être un nombre";
                return false;
            }
            return true;
        }

        if ($rule === 'array') {
            if (!is_array($value)) {
                $this->errors[$field] = "Le champ $field doit être un tableau";
                return false;
            }
            return true;
        }

        if ($rule === 'boolean') {
            if (!is_bool($value) && $value !== 0 && $value !== 1) {
                $this->errors[$field] = "Le champ $field doit être un booléen";
                return false;
            }
            return true;
        }

        if ($rule === 'date') {
            if (!strtotime($value)) {
                $this->errors[$field] = "Le champ $field doit être une date valide";
                return false;
            }
            return true;
        }

        if (strpos($rule, 'size:') === 0) {
            $size = (int) substr($rule, 5);
            if (strlen($value) !== $size) {
                $this->errors[$field] = "Le champ $field doit contenir exactement $size caractères";
                return false;
            }
            return true;
        }

        return true;
    }

    public function getErrors() {
        return $this->errors;
    }

    public function getFirstError() {
        return !empty($this->errors) ? reset($this->errors) : null;
    }

    // Validation spécifique pour les données de simulation
    public function validateSimulationParameters($parameters) {
        $requiredParams = [
            'initial_conditions' => ['required', 'array'],
            'physical_constants' => ['array'],
            'time_parameters' => ['array']
        ];

        foreach ($requiredParams as $param => $rules) {
            if (!isset($parameters[$param])) {
                $this->errors[$param] = "Le paramètre $param est requis";
                return false;
            }
        }

        // Validation des conditions initiales
        if (isset($parameters['initial_conditions'])) {
            $icRules = [
                'position' => ['required', 'array'],
                'velocity' => ['required', 'array'],
                'mass' => ['required', 'numeric']
            ];

            if (!$this->validate($parameters['initial_conditions'], $icRules)) {
                return false;
            }
        }

        return true;
    }

    // Validation pour les données de recherche
    public function validateResearchData($data) {
        $rules = [
            'data_type' => ['required', 'string'],
            'data_values' => ['required', 'array'],
            'timestamp' => ['date']
        ];

        return $this->validate($data, $rules);
    }

    // Validation pour l'export
    public function validateExportRequest($data) {
        $rules = [
            'export_type' => ['required', 'in:csv,json,xml,pdf,xlsx'],
            'data_type' => ['required', 'string'],
            'filters' => ['array'],
            'include_metadata' => ['boolean']
        ];

        return $this->validate($data, $rules);
    }

    // Nettoyage des données
    public function sanitize($data) {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                $data[$key] = $this->sanitize($value);
            }
            return $data;
        }

        if (is_string($data)) {
            // Échapper les caractères spéciaux pour la sécurité
            return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
        }

        return $data;
    }

    // Validation d'email avancée
    public function isValidEmail($email) {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        // Vérifier le domaine MX
        $domain = substr(strrchr($email, "@"), 1);
        return checkdnsrr($domain, "MX");
    }

    // Validation de force de mot de passe
    public function isStrongPassword($password) {
        if (strlen($password) < 8) {
            $this->errors['password'] = "Le mot de passe doit contenir au moins 8 caractères";
            return false;
        }

        if (!preg_match('/[A-Z]/', $password)) {
            $this->errors['password'] = "Le mot de passe doit contenir au moins une majuscule";
            return false;
        }

        if (!preg_match('/[a-z]/', $password)) {
            $this->errors['password'] = "Le mot de passe doit contenir au moins une minuscule";
            return false;
        }

        if (!preg_match('/[0-9]/', $password)) {
            $this->errors['password'] = "Le mot de passe doit contenir au moins un chiffre";
            return false;
        }

        if (!preg_match('/[^A-Za-z0-9]/', $password)) {
            $this->errors['password'] = "Le mot de passe doit contenir au moins un caractère spécial";
            return false;
        }

        return true;
    }
}
?>