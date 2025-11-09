import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './ExpoMapkit.types';

type ExpoMapkitModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class ExpoMapkitModule extends NativeModule<ExpoMapkitModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(ExpoMapkitModule, 'ExpoMapkitModule');
