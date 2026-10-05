import { StyleSheet, Text, View } from 'react-native';

export default function SummaryScreen() {
  return (
    <View style={styles.container}>
      <Text>Monthwise</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
