import { NativeModule, requireNativeModule } from 'expo';

import { ExpoMapkitModuleEvents } from './ExpoMapkit.types';

declare class ExpoMapkitModule extends NativeModule<ExpoMapkitModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoMapkitModule>('ExpoMapkit');
