import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const DrinkResult = () => {
  const router = useRouter();
  const { result } = useLocalSearchParams();

  
  if (!result) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Your Drink Recipe</Text>

      <Text style={styles.content}>{result}</Text>

      <Button title="Back to Main" onPress={() => router.replace('/MainScreen')} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  content: {
    fontSize: 16,
    marginBottom: 10,
  },
});

export default DrinkResult; 