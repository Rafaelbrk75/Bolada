import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { formatarDataHora } from '../utils/data';

/**
 * Data + hora num só campo.
 * Android: dois diálogos em sequência (data, depois hora) via API imperativa.
 * iOS: picker compacto inline.
 */
export function SeletorDataHora({
  valor,
  onChange,
  minimo,
}: {
  valor: Date;
  onChange: (data: Date) => void;
  minimo?: Date;
}) {
  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={valor}
        mode="datetime"
        display="compact"
        minimumDate={minimo}
        onChange={(_evento, data) => data && onChange(data)}
      />
    );
  }

  function abrir() {
    DateTimePickerAndroid.open({
      value: valor,
      mode: 'date',
      minimumDate: minimo,
      onChange: (_evento, dataEscolhida) => {
        if (!dataEscolhida) return;
        // O picker de hora herda o dia de `dataEscolhida`, então o retorno já vem completo.
        DateTimePickerAndroid.open({
          value: dataEscolhida,
          mode: 'time',
          is24Hour: true,
          onChange: (_e, dataHoraFinal) => dataHoraFinal && onChange(dataHoraFinal),
        });
      },
    });
  }

  return (
    <Pressable style={styles.botao} onPress={abrir}>
      <Text style={styles.texto}>{formatarDataHora(valor)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  texto: { fontSize: 16, color: '#111827' },
});
