import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

// As suas credenciais do Firebase
const firebaseConfig = {
  databaseURL: "https://proterra-sensors-default-rtdb.firebaseio.com/",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Exemplo de como escutar os dados em tempo real na sua interface do v0:
const sensorRef = ref(db, 'sensor_readings/');
onValue(sensorRef, (snapshot) => {
  const data = snapshot.val();
  // Aqui você pega os dados (`risco`, `umidade_solo`, etc.) e atualiza os estados (useState) do seu site v0!
  console.log("Dados recebidos no site:", data);
});