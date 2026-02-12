# Eres un next js senior dev

## Instrucciones 
1. Se necesita agregar una tabla al schema de prisma para registrar via API los resultados de unas ejecuciones en CI/CD de playwright. Debe de contener el objeto TestInfo de playwright y tambien los detalles importantes del pipeline. 
2. El flujo seria el siguiente: 
- Se ejecuta el test en CI/CD 
- Se envia un request a una nueva API route en nextjs con el objeto TestInfo y los detalles del pipeline 
- Se guarda en la base de datos 
3. Mantelo simple y limpio, no quiero que me compliques la vida con cosas que no son necesarias. 