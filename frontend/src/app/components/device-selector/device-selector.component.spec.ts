import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeviceSelectorComponent, DevicePreset } from './device-selector.component';
import { ComponentRef } from '@angular/core';

describe('DeviceSelectorComponent', () => {
  let component: DeviceSelectorComponent;
  let fixture: ComponentFixture<DeviceSelectorComponent>;
  let componentRef: ComponentRef<DeviceSelectorComponent>;

  const mockPresets: DevicePreset[] = [
    { id: 'mobile', name: 'Mobile', width: 375, height: 667 },
    { id: 'desktop', name: 'Desktop', width: 1920, height: 1080 }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviceSelectorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DeviceSelectorComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('selectedDevice', mockPresets[0]);
    componentRef.setInput('devicePresets', mockPresets);
    fixture.detectChanges();
  });

  it('dovrebbe creare il component', () => {
    expect(component).toBeTruthy();
  });

  it('selectedDevice dovrebbe essere impostato', () => {
    expect(component.selectedDevice().id).toBe('mobile');
  });

  it('devicePresets dovrebbe essere impostato', () => {
    expect(component.devicePresets().length).toBe(2);
  });

  it('selectDevice dovrebbe emettere device', (done) => {
    component.deviceSelected.subscribe((device) => {
      expect(device.id).toBe('desktop');
      done();
    });
    component.selectDevice(mockPresets[1]);
  });

  it('openCustomSizeDialog dovrebbe mostrare dialog', () => {
    component.openCustomSizeDialog();
    expect(component.showCustomSizeDialog()).toBe(true);
  });

  it('closeCustomSizeDialog dovrebbe nascondere dialog', () => {
    component.showCustomSizeDialog.set(true);
    component.closeCustomSizeDialog();
    expect(component.showCustomSizeDialog()).toBe(false);
  });

  it('applyCustomSize dovrebbe creare device custom', (done) => {
    component.customWidth.set(1024);
    component.customHeight.set(768);

    component.deviceSelected.subscribe((device) => {
      expect(device.id).toBe('custom');
      expect(device.width).toBe(1024);
      expect(device.height).toBe(768);
      expect(component.showCustomSizeDialog()).toBe(false);
      done();
    });

    component.applyCustomSize();
  });
});
