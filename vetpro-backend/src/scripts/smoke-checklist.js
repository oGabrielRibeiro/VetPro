const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";

function randomEmail() {
  const nonce = Date.now();
  return `smoke.${nonce}@vetpro.local`;
}

function randomName() {
  return `Smoke Vet ${Date.now()}`;
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, options);

  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} - ${path}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`
  };
}

async function run() {
  const checks = [];
  const registerEmail = randomEmail();
  const password = "123456";

  console.log(`Base URL: ${BASE_URL}`);

  try {
    const registerPayload = {
      name: randomName(),
      email: registerEmail,
      password,
      clinicName: "Clinica Smoke"
    };

    const register = await request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registerPayload)
    });
    checks.push("register");

    const token = register?.token || register?.data?.token;
    if (!token) throw new Error("Token nao retornado em register");

    const login = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: registerEmail, password })
    });
    checks.push("login");

    const loginToken = login?.token || login?.data?.token;
    if (!loginToken) throw new Error("Token nao retornado em login");

    const me = await request("/auth/me", {
      method: "GET",
      headers: authHeaders(loginToken)
    });
    if (!me?.id) throw new Error("/auth/me sem id");
    checks.push("me");

    let invalidTokenRejected = false;
    try {
      await request("/auth/me", {
        method: "GET",
        headers: authHeaders("token-invalido")
      });
    } catch (err) {
      invalidTokenRejected = err.status === 401;
    }
    if (!invalidTokenRejected) throw new Error("token invalido nao foi rejeitado");
    checks.push("token_invalid");

    const patientPayload = {
      name: "Paciente Smoke",
      species: "Mamifero",
      breed: "SRD",
      age: 4,
      ownerName: "Tutor Smoke",
      ownerPhone: "11999990000"
    };

    const patient = await request("/patients", {
      method: "POST",
      headers: {
        ...authHeaders(loginToken),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(patientPayload)
    });

    if (!patient?.id) throw new Error("paciente sem id");
    checks.push("create_patient");

    const consultationPayload = {
      patientId: patient.id,
      consultationType: "nova",
      weight: 12.5,
      temperature: 38.7,
      heartRate: 120,
      respiratoryRate: 28,
      chiefComplaint: "coceira",
      anamnesis: "tutor relata coceira intensa",
      physicalExam: "lesoes superficiais",
      diagnosis: "dermatite",
      treatment: "higiene e anti-inflamatorio",
      procedures: "Nao realizado",
      medications: "prednisolona 5mg por 5 dias",
      notes: "smoke checklist"
    };

    const consultation = await request("/consultations", {
      method: "POST",
      headers: {
        ...authHeaders(loginToken),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(consultationPayload)
    });

    if (!consultation?.id) throw new Error("consulta sem id");
    checks.push("create_consultation");

    const formData = new FormData();
    formData.append(
      "segments",
      JSON.stringify([
        { stamp: "00:03", speaker: "Tutor", text: "ele esta com coceira" },
        { stamp: "00:10", speaker: "Medico", text: "diagnostico dermatite" }
      ])
    );
    formData.append(
      "transcript",
      "Tutor: ele esta com coceira. Medico: diagnostico dermatite e prescrevo pomada"
    );

    const fieldAssist = await request("/consultations/field-assist", {
      method: "POST",
      headers: {
        ...authHeaders(loginToken)
      },
      body: formData
    });

    if (!fieldAssist?.parsed) throw new Error("field-assist sem parsed");
    checks.push("field_assist");

    const prescription = await request(`/consultations/${consultation.id}/prescription`, {
      method: "POST",
      headers: {
        ...authHeaders(loginToken),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ download: false })
    });

    if (!prescription?.consultationId) throw new Error("receita nao anexada");
    checks.push("prescription_attach");

    const consultationsList = await request("/consultations", {
      method: "GET",
      headers: authHeaders(loginToken)
    });
    if (!Array.isArray(consultationsList) || consultationsList.length === 0) {
      throw new Error("lista de consultas vazia");
    }
    checks.push("list_consultations");

    console.log("\nSMOKE CHECKLIST OK");
    checks.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item}`);
    });
  } catch (error) {
    console.error("\nSMOKE CHECKLIST FALHOU");
    console.error(error.message);
    if (error.data) {
      console.error("Detalhes:", JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

run();
