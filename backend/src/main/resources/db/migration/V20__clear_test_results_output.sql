-- V20: Limpiar y no almacenar la salida exacta de cada test en el histórico de entregas
UPDATE test_results
SET stdout = NULL,
    stderr = NULL,
    expected_output = NULL,
    actual_output = NULL;

