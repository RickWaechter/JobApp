import * as React from 'react';

import { ExpoMapkitViewProps } from './ExpoMapkit.types';

export default function ExpoMapkitView(props: ExpoMapkitViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
