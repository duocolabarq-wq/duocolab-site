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

export type ProjetoCompleto = Projeto & {
  etapas: Etapa[]; marcos: Marco[]; decisoes: Decisao[]; documentos: Documento[]; reunioes: Reuniao[];
  links: LinkP[]; compras: Compra[]; ambientes: Ambiente[]; pessoas: Pessoa[]; acessos: string[];
};

export const TAG_TXT: Record<St, string> = { ok: "Concluído", and: "Em andamento", pend: "Pendente" };
