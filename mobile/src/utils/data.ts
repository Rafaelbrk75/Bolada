export function formatarDataHora(data: Date): string {
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function somarMinutos(data: Date, minutos: number): Date {
  return new Date(data.getTime() + minutos * 60_000);
}

export function somarHoras(data: Date, horas: number): Date {
  return somarMinutos(data, horas * 60);
}

/** Próxima hora cheia a partir de agora — chute inicial razoável pro formulário. */
export function proximaHoraCheia(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return somarHoras(d, 1);
}
