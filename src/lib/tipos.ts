export type St = "ok" | "and" | "pend";
export type Projeto = {
  id: string; codigo: string; titulo: string; cliente: string; subtitulo: string; servico: string; status: string;
  capa_url: string; vistorias_feitas: number; vistorias_contratadas: number; vistorias_texto: string;
  observacao_documentos: string; arquivado: boolean; atualizado_em: string;
};
export type Etapa = { id?: string; ordem: number; nome: string; status: St; periodo: string; itens: string[] };
export type Marco = { id?: string; ordem: number; valor: string; rotulo: string; proximo: boolean };
export type Decisao = {
  id: string; ordem: number; titulo: string; descricao: string; prazo: string;
  status: "aberta" | "aprovada" | "ajuste" | "resolvida"; resposta: string; respondido_por: string;
  respondido_em: string | null; lida_pela_equipe: boolean;
};
export type Documento = { id?: string; titulo: string; data: string | null; url: string };
export type Reuniao = { id?: string; ordem: number; titulo: string; descricao: string; data: string };
export type LinkP = { id?: string; ordem: number; tipo: string; titulo: string; url: string };
export type Compra = { id?: string; categoria: string; item: string; fornecedor: string; status: St };
export type Ambiente = { id?: string; ordem: number; titulo: string; imagem_url: string };
export type Pessoa = { id?: string; ordem: number; nome: string; papel: string };

export type TipoDoc = "andamento" | "guia" | "etapas" | "perspectivas" | "marcenaria" | "conferencia" | "painel";
export type DocProjeto = {
  id: string; projeto_id: string; tipo: TipoDoc; titulo: string; subtitulo: string; versao: string;
  data: string | null; so_equipe: boolean; ordem: number; origem: string; atualizado_em: string;
};

/** Ordem e nomes dos tipos de documento, como aparecem para o cliente. */
export const TIPOS_DOC: { k: TipoDoc; nome: string; desc: string }[] = [
  { k: "andamento", nome: "Andamento", desc: "Onde o projeto e a obra estão, o que foi decidido e o que vem a seguir." },
  { k: "guia", nome: "Guia do projeto", desc: "O projeto explicado ambiente por ambiente, com as orientações de obra." },
  { k: "etapas", nome: "Etapas da obra", desc: "A sequência da obra, etapa por etapa." },
  { k: "perspectivas", nome: "Perspectivas", desc: "As imagens do projeto, o conceito de cada ambiente e o moodboard." },
  { k: "marcenaria", nome: "Marcenaria", desc: "O caderno técnico da marcenaria, móvel por móvel." },
  { k: "conferencia", nome: "Conferência", desc: "Conferência de itens do projeto com os pedidos e a obra." },
  { k: "painel", nome: "Painel interno", desc: "Uso da equipe. O cliente não vê." },
];
export const nomeTipo = (t: TipoDoc) => TIPOS_DOC.find((x) => x.k === t)?.nome ?? t;
export const ordenarDocs = (l: DocProjeto[]) =>
  [...l].sort((a, b) => TIPOS_DOC.findIndex((x) => x.k === a.tipo) - TIPOS_DOC.findIndex((x) => x.k === b.tipo) || a.ordem - b.ordem);

export type ProjetoCompleto = Projeto & {
  etapas: Etapa[]; marcos: Marco[]; decisoes: Decisao[]; documentos: Documento[]; reunioes: Reuniao[];
  links: LinkP[]; compras: Compra[]; ambientes: Ambiente[]; pessoas: Pessoa[]; acessos: string[];
  docs: DocProjeto[];
};

export const TAG_TXT: Record<St, string> = { ok: "Concluído", and: "Em andamento", pend: "Pendente" };
