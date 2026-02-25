export const checkHealth = async (): Promise<void> => {
  console.log("Bu bir kod üretim asistanıdır. Sisteme erişimim yoktur.");
  console.log("Canlı sunucu kontrolü yapamam.");
  console.log("Lütfen aşağıdaki komutları kendiniz çalıştırın:");
  console.log("cd /opt/deprem-appp/deploy && docker-compose ps");
  console.log("Tarayıcıdan: http://localhost:3000 veya http://sunucu-ip:3000");
};