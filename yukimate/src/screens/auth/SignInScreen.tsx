import { useState } from 'react';
import { supabase } from '@lib/supabase';
import { View, TextInput, Button, Alert } from 'react-native';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Check your email', 'Magic link sent!');
  };
  return (
    <View style={{ padding: 16 }}>
      <TextInput placeholder="email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <Button title="Sign in with magic link" onPress={signIn} />
    </View>
  );
}
