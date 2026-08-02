import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PleiApp } from './src/plei/PleiApp';

export default function App() {
  return (
    <SafeAreaProvider>
      <PleiApp />
    </SafeAreaProvider>
  );
}
