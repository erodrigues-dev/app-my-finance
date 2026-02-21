import { Link } from 'expo-router';
import React from 'react';
import { Linking } from 'react-native';

export function ExternalLink(
  props: Omit<React.ComponentProps<typeof Link>, 'href'> & { href: string }
) {
  return (
    <Link
      target="_blank"
      {...props}
      // @ts-expect-error: External URLs are not typed.
      href={props.href}
      onPress={(e) => {
        e.preventDefault();
        Linking.openURL(props.href as string);
      }}
    />
  );
}
