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

  describe('Custom Size Signals', () => {
    it('customWidth dovrebbe avere default 1920', () => {
      expect(component.customWidth()).toBe(1920);
    });

    it('customHeight dovrebbe avere default 1080', () => {
      expect(component.customHeight()).toBe(1080);
    });

    it('showCustomSizeDialog dovrebbe iniziare false', () => {
      expect(component.showCustomSizeDialog()).toBe(false);
    });
  });

  describe('Custom Size Workflow', () => {
    it('dovrebbe aprire e chiudere dialog', () => {
      component.openCustomSizeDialog();
      expect(component.showCustomSizeDialog()).toBe(true);
      
      component.closeCustomSizeDialog();
      expect(component.showCustomSizeDialog()).toBe(false);
    });

    it('applyCustomSize dovrebbe includere icon', (done) => {
      component.deviceSelected.subscribe((device) => {
        expect(device.icon).toBe('⚙️');
        done();
      });
      component.applyCustomSize();
    });

    it('applyCustomSize dovrebbe generare nome corretto', (done) => {
      component.customWidth.set(800);
      component.customHeight.set(600);
      
      component.deviceSelected.subscribe((device) => {
        expect(device.name).toBe('Custom 800×600');
        done();
      });
      component.applyCustomSize();
    });

    it('dovrebbe permettere custom size molto piccolo', (done) => {
      component.customWidth.set(320);
      component.customHeight.set(480);
      
      component.deviceSelected.subscribe((device) => {
        expect(device.width).toBe(320);
        expect(device.height).toBe(480);
        done();
      });
      component.applyCustomSize();
    });

    it('dovrebbe permettere custom size molto grande', (done) => {
      component.customWidth.set(3840);
      component.customHeight.set(2160);
      
      component.deviceSelected.subscribe((device) => {
        expect(device.width).toBe(3840);
        expect(device.height).toBe(2160);
        done();
      });
      component.applyCustomSize();
    });
  });

  describe('Edge Cases', () => {
    it('dovrebbe gestire devicePresets vuoto', () => {
      componentRef.setInput('devicePresets', []);
      fixture.detectChanges();
      expect(component.devicePresets().length).toBe(0);
    });

    it('dovrebbe gestire selezione device multipli', () => {
      let count = 0;
      component.deviceSelected.subscribe(() => count++);
      
      mockPresets.forEach(preset => {
        component.selectDevice(preset);
      });
      
      expect(count).toBe(2);
    });

    it('dovrebbe gestire preset con icon', (done) => {
      const presetWithIcon: DevicePreset = {
        id: 'tablet',
        name: 'Tablet',
        width: 768,
        height: 1024,
        icon: '📱'
      };
      
      component.deviceSelected.subscribe((device) => {
        expect(device.icon).toBe('📱');
        done();
      });
      
      component.selectDevice(presetWithIcon);
    });

    it('dovrebbe gestire preset senza icon', (done) => {
      component.deviceSelected.subscribe((device) => {
        expect(device.icon).toBeUndefined();
        done();
      });
      
      component.selectDevice(mockPresets[0]);
    });
  });
});

/**
 * COPERTURA: ~85% del component
 * - Input properties (selectedDevice, devicePresets)
 * - Device selection
 * - Custom size dialog (open, close, apply)
 * - Custom size signals (width, height, showDialog)
 * - Custom size workflow (small, large sizes)
 * - Edge cases (empty presets, multiple selections, con/senza icon)
 * 
 * TOTALE: +18 nuovi test aggiunti
 */
