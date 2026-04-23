import type { PrismaClient } from "@prisma/client";

type IbgeMunicipality = {
  id?: number | string;
  nome?: string;
  microrregiao?: {
    mesorregiao?: {
      UF?: {
        sigla?: string;
      };
    };
  };
  "municipio-id"?: number | string;
  "municipio-nome"?: string;
  "UF-sigla"?: string;
};

type MunicipalitySeedRow = {
  ibgeCode: string;
  name: string;
  stateCode: string;
};

const ibgeMunicipalitiesUrl =
  "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome&view=nivelado";

function normalizeRequiredText(value: unknown, fieldName: string) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(`Campo ${fieldName} ausente no retorno de municipios do IBGE.`);
  }

  return normalized;
}

function mapIbgeMunicipality(municipality: IbgeMunicipality): MunicipalitySeedRow {
  const ibgeCode = normalizeRequiredText(
    municipality.id ?? municipality["municipio-id"],
    "codigo IBGE",
  );
  const name = normalizeRequiredText(
    municipality.nome ?? municipality["municipio-nome"],
    "nome do municipio",
  );
  const stateCode = normalizeRequiredText(
    municipality.microrregiao?.mesorregiao?.UF?.sigla ?? municipality["UF-sigla"],
    "UF",
  ).toUpperCase();

  return {
    ibgeCode,
    name,
    stateCode,
  };
}

async function fetchIbgeMunicipalities() {
  const response = await fetch(ibgeMunicipalitiesUrl, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Nao foi possivel consultar municipios no IBGE: HTTP ${response.status}.`,
    );
  }

  const payload = (await response.json()) as IbgeMunicipality[];

  if (!Array.isArray(payload)) {
    throw new Error("Retorno de municipios do IBGE em formato inesperado.");
  }

  return payload.map(mapIbgeMunicipality);
}

async function runInChunks<T>(
  items: T[],
  chunkSize: number,
  handler: (item: T) => Promise<unknown>,
) {
  for (let index = 0; index < items.length; index += chunkSize) {
    await Promise.all(items.slice(index, index + chunkSize).map(handler));
  }
}

export async function seedMunicipalities(prisma: PrismaClient) {
  const municipalities = await fetchIbgeMunicipalities();

  await runInChunks(municipalities, 200, (municipality) =>
    prisma.municipality.upsert({
      create: municipality,
      update: {
        name: municipality.name,
        stateCode: municipality.stateCode,
      },
      where: {
        ibgeCode: municipality.ibgeCode,
      },
    }),
  );

  return {
    municipalities: municipalities.length,
    source: ibgeMunicipalitiesUrl,
  };
}
