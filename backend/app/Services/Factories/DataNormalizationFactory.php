<?php

namespace App\Services\Factories;

/**
 * DataNormalizationFactory
 * 
 * Factory per normalizzare e sanificare dati provenienti da form e request.
 * Centralizza la logica di normalizzazione per evitare duplicazione.
 */
class DataNormalizationFactory
{
    /**
     * Normalizza stringhe vuote in null per campi nullable
     * 
     * @param array $data Dati da normalizzare
     * @param array $nullableFields Campi che devono essere null se vuoti
     * @return array Dati normalizzati
     */
    public static function normalizeNullableFields(array $data, array $nullableFields): array
    {
        foreach ($nullableFields as $field) {
            if (isset($data[$field]) && $data[$field] === '') {
                $data[$field] = null;
            }
        }
        
        return $data;
    }

    /**
     * Trim di tutti i campi stringa in un array
     * 
     * @param array $data Dati da processare
     * @param array $excludeFields Campi da escludere dal trim (opzionale)
     * @return array Dati con stringhe trimmati
     */
    public static function trimAllStrings(array $data, array $excludeFields = []): array
    {
        foreach ($data as $key => $value) {
            if (in_array($key, $excludeFields)) {
                continue;
            }
            
            if (is_string($value)) {
                $data[$key] = trim($value);
            }
        }
        
        return $data;
    }

    /**
     * Converte valori booleani da stringhe
     * 
     * Converte "true"/"1"/"yes" -> true, "false"/"0"/"no" -> false
     * 
     * @param array $data Dati da processare
     * @param array $booleanFields Campi che sono booleani
     * @return array Dati con booleani convertiti
     */
    public static function normalizeBooleanFields(array $data, array $booleanFields): array
    {
        foreach ($booleanFields as $field) {
            if (isset($data[$field])) {
                $data[$field] = self::parseBoolean($data[$field]);
            }
        }
        
        return $data;
    }

    /**
     * Parse di un valore booleano da vari formati
     * 
     * @param mixed $value Valore da convertire
     * @return bool Valore booleano
     */
    public static function parseBoolean($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        
        if (is_string($value)) {
            $value = strtolower(trim($value));
            return in_array($value, ['1', 'true', 'yes', 'on'], true);
        }
        
        return (bool) $value;
    }

    /**
     * Normalizza un array di dati per la creazione/aggiornamento
     * 
     * Applica trim, conversione null e booleani in un'unica operazione
     * 
     * @param array $data Dati da normalizzare
     * @param array $nullableFields Campi nullable
     * @param array $booleanFields Campi booleani
     * @param array $excludeFromTrim Campi da escludere dal trim
     * @return array Dati normalizzati
     */
    public static function normalize(
        array $data, 
        array $nullableFields = [], 
        array $booleanFields = [],
        array $excludeFromTrim = []
    ): array {
        // 1. Trim tutte le stringhe
        $data = self::trimAllStrings($data, $excludeFromTrim);
        
        // 2. Converti stringhe vuote in null per campi nullable
        $data = self::normalizeNullableFields($data, $nullableFields);
        
        // 3. Normalizza campi booleani
        $data = self::normalizeBooleanFields($data, $booleanFields);
        
        return $data;
    }

    /**
     * Rimuove campi vuoti o null da un array
     * 
     * @param array $data Dati da pulire
     * @param bool $removeNull Se true, rimuove anche i valori null
     * @return array Dati puliti
     */
    public static function removeEmptyFields(array $data, bool $removeNull = true): array
    {
        return array_filter($data, function ($value) use ($removeNull) {
            if ($removeNull && $value === null) {
                return false;
            }
            
            if ($value === '') {
                return false;
            }
            
            return true;
        });
    }

    /**
     * Sanifica input per prevenire XSS (base)
     * 
     * @param string $input Input da sanificare
     * @return string Input sanificato
     */
    public static function sanitizeInput(string $input): string
    {
        return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
    }

    /**
     * Converte un array associativo in formato array di oggetti
     * 
     * @param array $data Array associativo
     * @return array Array di oggetti
     */
    public static function toObjectArray(array $data): array
    {
        return array_map(function ($item) {
            return is_array($item) ? (object) $item : $item;
        }, $data);
    }

    /**
     * Filtra campi permessi da un array
     * 
     * @param array $data Dati originali
     * @param array $allowedFields Campi permessi
     * @return array Dati filtrati
     */
    public static function filterAllowedFields(array $data, array $allowedFields): array
    {
        return array_intersect_key($data, array_flip($allowedFields));
    }

    /**
     * Converte empty string in null ricorsivamente
     * 
     * @param mixed $value Valore da convertire
     * @return mixed Valore convertito
     */
    public static function emptyToNullRecursive($value)
    {
        if (is_array($value)) {
            return array_map([self::class, 'emptyToNullRecursive'], $value);
        }
        
        return $value === '' ? null : $value;
    }
}

