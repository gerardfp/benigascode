# DDoS

Desitjem implementar una sistema d'alerta d'atacs de denegació de servei (DDoS). Aquests atacs consisteixen en que l'atacant realitza una gran quantitat de connexions utilitzant una botnet.

![image](1557432901-54eba1401d-sshattack1.png)

Una forma de prevenir aquests atacs és mitjançant una política que denegui les connexions si aquestes es produeixen amb massa freqüència (connexions/temps).

Implementarem al firewall un sistema de detecció d'atacs DDoS, que alerti quan es produeixen més connexions de les permeses en un període de temps.

Establirem aquesta política a 4 connexions en 1 segon. Cada cop que es superi aquesta freqüència es mostrarà una alerta.

## Input

La entrada consisteix en una seqüència de *floats* que indiquen el temps (T) que ha passat entre una connexió i la següent.

La seqüencia acaba amb -1.

## Output

S'imprimirà el missatge "DDos alert", cada cop que es superin les 4 connexions en menys d'1 segon.
