import { Component, input, output, signal } from '@angular/core';

export interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  icon?: string;
}

@Component({
  selector: 'app-device-selector',
  standalone: true,
  imports: [],
  templateUrl: './device-selector.component.html',
  styleUrl: './device-selector.component.css'
})
export class DeviceSelectorComponent {
  // Input: dispositivo attualmente selezionato
  selectedDevice = input.required<DevicePreset>();
  
  // Input: lista di preset disponibili
  devicePresets = input.required<DevicePreset[]>();
  
  // Output: emette quando viene selezionato un dispositivo
  deviceSelected = output<DevicePreset>();
  
  // Stato interno: dialog custom size
  showCustomSizeDialog = signal(false);
  customWidth = signal(1920);
  customHeight = signal(1080);
  
  /**
   * Seleziona un dispositivo
   */
  selectDevice(device: DevicePreset): void {
    this.deviceSelected.emit(device);
  }
  
  /**
   * Apre il dialog per dimensioni custom
   */
  openCustomSizeDialog(): void {
    this.showCustomSizeDialog.set(true);
  }
  
  /**
   * Applica le dimensioni custom e crea un dispositivo personalizzato
   */
  applyCustomSize(): void {
    const customDevice: DevicePreset = {
      id: 'custom',
      name: `Custom ${this.customWidth()}×${this.customHeight()}`,
      width: this.customWidth(),
      height: this.customHeight(),
      icon: '⚙️'
    };
    
    this.deviceSelected.emit(customDevice);
    this.showCustomSizeDialog.set(false);
  }
  
  /**
   * Chiude il dialog custom size
   */
  closeCustomSizeDialog(): void {
    this.showCustomSizeDialog.set(false);
  }
}

