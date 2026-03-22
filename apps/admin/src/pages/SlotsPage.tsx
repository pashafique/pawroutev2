import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Switch,
  DatePicker, TimePicker, Popconfirm, Space, Tag, Badge,
  message, Select, Tabs, Divider,
} from 'antd';
import {
  PlusOutlined, StopOutlined, CheckCircleOutlined,
  DeleteOutlined, CalendarOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { appConfig } from '@pawroute/config';
import { api } from '../lib/api';

const c = appConfig.brand.colors;

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  isBlocked: boolean;
  blockReason?: string;
  groomer?: { id: string; name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  available: 'success',
  full: 'error',
  blocked: 'default',
  partial: 'warning',
};

function slotStatus(slot: TimeSlot): 'available' | 'full' | 'blocked' | 'partial' {
  if (slot.isBlocked) return 'blocked';
  if (slot.bookedCount >= slot.capacity) return 'full';
  if (slot.bookedCount > 0) return 'partial';
  return 'available';
}

export default function SlotsPage() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().format('YYYY-MM-DD'),
    dayjs().add(6, 'day').format('YYYY-MM-DD'),
  ]);

  const [createModal, setCreateModal] = useState(false);
  const [generateModal, setGenerateModal] = useState(false);
  const [blockModal, setBlockModal] = useState<{ open: boolean; slot?: TimeSlot }>({ open: false });

  const [createForm] = Form.useForm();
  const [generateForm] = Form.useForm();
  const [blockForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/slots', {
        params: { startDate: dateRange[0], endDate: dateRange[1] },
      });
      // Flatten grouped by date
      const grouped = res.data.data as Record<string, TimeSlot[]>;
      const flat = Object.values(grouped).flat();
      setSlots(flat);
    } catch {
      message.error('Failed to load slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [dateRange]);

  const handleCreate = async () => {
    const vals = await createForm.validateFields();
    setSaving(true);
    try {
      await api.post('/slots', {
        date: vals.date.format('YYYY-MM-DD'),
        startTime: vals.startTime.format('HH:mm'),
        endTime: vals.endTime.format('HH:mm'),
        capacity: vals.capacity ?? 1,
      });
      message.success('Slot created');
      setCreateModal(false);
      createForm.resetFields();
      load();
    } catch { message.error('Failed to create slot'); }
    finally { setSaving(false); }
  };

  const handleGenerate = async () => {
    const vals = await generateForm.validateFields();
    setSaving(true);
    try {
      const res = await api.post('/slots/generate', {
        startDate: vals.dateRange[0].format('YYYY-MM-DD'),
        endDate: vals.dateRange[1].format('YYYY-MM-DD'),
        startTime: vals.startTime.format('HH:mm'),
        endTime: vals.endTime.format('HH:mm'),
        slotDurationMin: vals.slotDurationMin,
        breakMinutes: vals.breakMinutes ?? 0,
        capacity: vals.capacity ?? 1,
        excludeWeekends: vals.excludeWeekends ?? false,
      });
      message.success(`${res.data.data.created} slots created`);
      setGenerateModal(false);
      generateForm.resetFields();
      load();
    } catch { message.error('Failed to generate slots'); }
    finally { setSaving(false); }
  };

  const handleBlock = async () => {
    const vals = await blockForm.validateFields();
    setSaving(true);
    try {
      await api.post(`/slots/${blockModal.slot!.id}/block`, { reason: vals.reason });
      message.success('Slot blocked');
      setBlockModal({ open: false });
      blockForm.resetFields();
      load();
    } catch { message.error('Failed to block slot'); }
    finally { setSaving(false); }
  };

  const handleUnblock = async (slotId: string) => {
    try {
      await api.post(`/slots/${slotId}/unblock`);
      message.success('Slot unblocked');
      load();
    } catch { message.error('Failed to unblock'); }
  };

  const handleDelete = async (slotId: string) => {
    try {
      await api.delete(`/slots/${slotId}`);
      message.success('Slot deleted');
      load();
    } catch (err: any) {
      message.error(err.response?.data?.error ?? 'Failed to delete');
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (v: string) => dayjs(v).format('ddd, DD MMM YYYY'),
      sorter: (a: TimeSlot, b: TimeSlot) => a.date.localeCompare(b.date),
    },
    {
      title: 'Time',
      key: 'time',
      render: (_: any, r: TimeSlot) => `${r.startTime} – ${r.endTime}`,
    },
    {
      title: 'Capacity',
      key: 'capacity',
      render: (_: any, r: TimeSlot) => `${r.bookedCount} / ${r.capacity}`,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, r: TimeSlot) => {
        const s = slotStatus(r);
        const labels = { available: 'Available', full: 'Full', blocked: 'Blocked', partial: 'Partial' };
        return <Badge status={STATUS_COLORS[s] as any} text={labels[s]} />;
      },
    },
    {
      title: 'Block reason',
      dataIndex: 'blockReason',
      key: 'blockReason',
      render: (v: string) => v ?? '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: TimeSlot) => (
        <Space size="small">
          {r.isBlocked ? (
            <Button size="small" icon={<CheckCircleOutlined />} onClick={() => handleUnblock(r.id)}>
              Unblock
            </Button>
          ) : (
            <Button size="small" danger icon={<StopOutlined />}
              onClick={() => { blockForm.resetFields(); setBlockModal({ open: true, slot: r }); }}>
              Block
            </Button>
          )}
          <Popconfirm
            title="Delete this slot?"
            description="Slots with active appointments cannot be deleted."
            onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: c.primary, fontSize: 22, fontWeight: 700 }}>Time Slot Management</h1>
        <Space>
          <Button icon={<ThunderboltOutlined />} onClick={() => { generateForm.resetFields(); setGenerateModal(true); }}>
            Generate Slots
          </Button>
          <Button type="primary" icon={<PlusOutlined />}
            style={{ backgroundColor: c.primary }}
            onClick={() => { createForm.resetFields(); setCreateModal(true); }}>
            New Slot
          </Button>
        </Space>
      </div>

      {/* Date range filter */}
      <div style={{ marginBottom: 16 }}>
        <DatePicker.RangePicker
          value={[dayjs(dateRange[0]), dayjs(dateRange[1])]}
          onChange={(vals) => {
            if (vals?.[0] && vals?.[1]) {
              setDateRange([vals[0].format('YYYY-MM-DD'), vals[1].format('YYYY-MM-DD')]);
            }
          }}
          style={{ marginRight: 8 }}
        />
        <Button icon={<CalendarOutlined />} onClick={load}>Refresh</Button>
      </div>

      {/* Summary counts */}
      <Space size="large" style={{ marginBottom: 16 }}>
        {(['available', 'partial', 'full', 'blocked'] as const).map((s) => {
          const count = slots.filter((sl) => slotStatus(sl) === s).length;
          const labels = { available: 'Available', partial: 'Partial', full: 'Full', blocked: 'Blocked' };
          return (
            <span key={s}>
              <Badge status={STATUS_COLORS[s] as any} text={`${labels[s]}: ${count}`} />
            </span>
          );
        })}
      </Space>

      <Table
        dataSource={slots}
        rowKey="id"
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 50 }}
        size="small"
      />

      {/* Create Slot Modal */}
      <Modal
        title="New Time Slot"
        open={createModal}
        onOk={handleCreate}
        onCancel={() => setCreateModal(false)}
        confirmLoading={saving}
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} disabledDate={(d) => d.isBefore(dayjs(), 'day')} />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="startTime" label="Start Time" rules={[{ required: true }]} style={{ flex: 1 }}>
              <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="endTime" label="End Time" rules={[{ required: true }]} style={{ flex: 1 }}>
              <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="capacity" label="Capacity" initialValue={1}>
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Generate Slots Modal */}
      <Modal
        title="Generate Slots in Bulk"
        open={generateModal}
        onOk={handleGenerate}
        onCancel={() => setGenerateModal(false)}
        confirmLoading={saving}
        width={520}
      >
        <Form form={generateForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="dateRange" label="Date Range" rules={[{ required: true }]}>
            <DatePicker.RangePicker style={{ width: '100%' }}
              disabledDate={(d) => d.isBefore(dayjs(), 'day')} />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="startTime" label="Day Start" rules={[{ required: true }]} style={{ flex: 1 }}>
              <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="endTime" label="Day End" rules={[{ required: true }]} style={{ flex: 1 }}>
              <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="slotDurationMin" label="Slot Duration (min)" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={15} max={480} step={15} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="breakMinutes" label="Break (min)" initialValue={0} style={{ flex: 1 }}>
              <InputNumber min={0} max={120} step={5} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="capacity" label="Capacity" initialValue={1} style={{ flex: 1 }}>
              <InputNumber min={1} max={20} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="excludeWeekends" label="Exclude Weekends" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Block Modal */}
      <Modal
        title={`Block Slot — ${blockModal.slot?.date} ${blockModal.slot?.startTime}`}
        open={blockModal.open}
        onOk={handleBlock}
        onCancel={() => setBlockModal({ open: false })}
        confirmLoading={saving}
      >
        <Form form={blockForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="reason" label="Reason (optional)">
            <Input placeholder="e.g. Public holiday, maintenance..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
