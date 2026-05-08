/** Tab keys aligned with StationRealtime `activeTab` for ESS/PV/EVSE/DG. */
export type EmuRealtimeDeviceTab = 'ess' | 'pv' | 'evse' | 'dg';

export type EmuRealtimeValueType = 'number' | 'string' | 'enum';

/** Single row from EMU 数据字段表 JSON（可扩展 meta 存寄存器等，暂不展示） */
export interface EmuRealtimeFieldDef {
  id: string;
  section: string;
  sectionOrder: number;
  order: number;
  labelZh: string;
  labelEn: string;
  unit: string;
  deviceTypes: EmuRealtimeDeviceTab[];
  valueType: EmuRealtimeValueType;
  meta?: Record<string, unknown>;
}

export interface EmuRealtimeFieldSection {
  section: string;
  sectionOrder: number;
  fields: EmuRealtimeFieldDef[];
}

export function groupEmuFieldsBySection(fields: EmuRealtimeFieldDef[]): EmuRealtimeFieldSection[] {
  const map = new Map<string, EmuRealtimeFieldSection>();
  for (const f of fields) {
    let g = map.get(f.section);
    if (!g) {
      g = { section: f.section, sectionOrder: f.sectionOrder, fields: [] };
      map.set(f.section, g);
    }
    g.fields.push(f);
  }
  const list = [...map.values()];
  list.sort((a, b) => a.sectionOrder - b.sectionOrder || a.section.localeCompare(b.section));
  for (const g of list) {
    g.fields.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  }
  return list;
}
