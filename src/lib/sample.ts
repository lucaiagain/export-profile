// Profilo d'esempio: azienda inventata, dichiarata come tale (stesse risposte del SAMPLE del prototipo).
import type { Answers } from "@/lib/engine";

export const SAMPLE_CONTACT = {
  company_name: "Oleificio Esempio",
  contact_name: "Mario Rossi",
  role: "Titolare",
  region: "Puglia",
  category: "Olio extravergine d'oliva",
};

export const SAMPLE_ANSWERS: Answers = {
  categoria: SAMPLE_CONTACT.category,
  nosito: false,
  com1: "2", com2: "3", com3: "3", com4: "2", com5: "3", com6: "2", com7: "2",
  org1: "2", org2: "3", org3: "2", org4: "3", org5: "2",
  off1: "4", off3: "2", off4: ["bio", "lab"], off5: "2",
  esp1: "3", esp2: "2", esp3: "2", esp4: "2", esp5: "3", esp6a: "4", esp6b: "2",
};

export const SAMPLE_MARKETS = ["Germania", "Paesi nordici", "Stati Uniti"];
