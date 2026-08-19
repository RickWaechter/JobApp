import { requireNativeView } from 'expo';
import * as React from 'react';

import { ExpoMapkitViewProps } from './ExpoMapkit.types';

const NativeView: React.ComponentType<ExpoMapkitViewProps> =
  requireNativeView('ExpoMapkit');

export default function ExpoMapkitView(props: ExpoMapkitViewProps) {
  return <NativeView {...props} />;
}
