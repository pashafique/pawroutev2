import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Select, Input, Tag, Space,
  DatePicker, message, Popconfirm, Badge, Descriptions,
  Timeline, Tabs,
} from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { appConfig } from '@pawroute/config';
import { api } from '../lib/api';

const c = appConfig.brand.colors;
const CUR = appConfig.locale.currencySymbol;

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'orange', CONFIRMED: 'blue', IN_PROGRESS: 'purple',
  COMPLETED: 'green', CANCELLED: 'red', NO_SHOW: 'default',
};

const STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

interface Appointment {
  id: string;
  bookingRef: string;
  status: string;
  totalAmount: number;
  serviceFee: number;
  addonFee: number;
  discountAmount: number;
  couponCode?: string;
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  user: { id: string; name: string; email: string; phone: string };
  pet: { id: string; name: string; type: string; sizeCategory: string };
  service: { id: string; name: string; durationMin: number };
  slot: { date: string; startTime: string; endTime: string };
  groomer?: { id: string; name: string } | null;
  addons: { addonName: string; addonPrice: number }[];
  payment?: { status: string; method: string; amount: number; paidAt?: string } | null;
  activities?: { action: string; performedBy: string; performedByType: string; note?: string; createdAt: string }[];
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [dateFilter, setDateFilter] = useState<string | undefined>();

  const [detail, setDetail] = useState<Appointment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusModal, setStatusModal] = useState<{ open: boolean; appt?: Appointment }>({ open: false });
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const res = await api.get('/appointments/admin', {
        params: { page: p, pageSize: 20, status: statusFilter, date: dateFilter, search: search || undefined },
      });
      setAppointments(res.data.data.appointments);
      setTotal(res.data.data.total);
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, statusFilter, dateFilter]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/appointments/admin/${id}`);
      setDetail(res.data.data);
    } catch { message.error('Failed to load detail'); }
    finally { setDetailLoading(false); }
  };

  const handleStatusUpdate = async () => {
    if (!statusModal.appt || !newStatus) return;
    setSaving(true);
    try {
      await api.patch(`/appointments/admin/${statusModal.appt.id}/status`, { status: newStatus, notes: statusNote });
      message.success('Status updated');
      setStatusModal({ open: false });
      setNewStatus(''); setStatusNote('');
      load();
      if (detail?.id === statusModal.appt.id) openDetail(detail.id);
    } catch { message.error('Failed'); }
    finally { setSaving(false); }
  };

  const columns = [
    {
      title: 'Ref',
      dataIndex: 'bookingRef',
      key: 'ref',
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span>,
    },
    {
      title: 'Customer',
      key: 'user',
      render: (_: any, r: Appointment) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.user.name}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{r.user.phone}</div>
        </div>
      ),
    },
    {
      title: 'Pet / Service',
      key: 'pet',
      render: (_: any, r: Appointment) => (
        <div>
          <div>{r.pet.name} <Tag style={{ fontSize: 10 }}>{r.pet.sizeCategory}</Tag></div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{r.service.name}</div>
        </div>
      ),
    },
    {
      title: 'Date / Time',
      key: 'slot',
      render: (_: any, r: Appointment) => (
        <div style={{ fontSize: 12 }}>
          <div>{dayjs(r.slot.date).format('ddd, DD MMM')}</div>
          <div style={{ color: '#6b7280' }}>{r.slot.startTime}</div>
        </div>
      ),
      sorter: (a: Appointment, b: Appointment) => a.slot.date.localeCompare(b.slot.date),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'amount',
      render: (v: number) => `${CUR} ${v}`,
    },
    {
      title: 'Payment',
      key: 'payment',
      render: (_: any, r: Appointment) => r.payment
        ? <Tag color={r.payment.status === 'SUCCESS' ? 'green' : 'orange'}>{r.payment.method}</Tag>
        : <Tag color="default">Unpaid</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: Appointment) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r.id)}>View</Button>
          <Button size="small" onClick={() => { setStatusModal({ open: true, appt: r }); setNewStatus(r.status); }}>
            Update Status
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: c.primary, fontSize: 22, fontWeight: 700 }}>Appointments</h1>
      </div>

      {/* Filters */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Search ref, name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={() => { setPage(1); load(1); }}
          style={{ width: 220 }}
        />
        <Select
          placeholder="Filter by status"
          allowClear
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          style={{ width: 160 }}
          options={STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
        />
        <DatePicker
          placeholder="Filter by date"
          onChange={(d) => { setDateFilter(d?.format('YYYY-MM-DD')); setPage(1); }}
        />
        <Button onClick={() => load()}>Refresh</Button>
      </Space>

      <Table
        dataSource={appointments}
        rowKey="id"
        columns={columns}
        loading={loading}
        size="small"
        pagination={{
          total, current: page, pageSize: 20,
          onChange: (p) => setPage(p),
          showTotal: (t) => `${t} appointments`,
        }}
      />

      {/* Detail Drawer */}
      <Modal
        title={`Appointment — ${detail?.bookingRef}`}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={680}
      >
        {detail && (
          <Tabs
            items={[
              {
                key: 'details',
                label: 'Details',
                children: (
                  <div>
                    <Descriptions column={2} size="small" bordered>
                      <Descriptions.Item label="Customer">{detail.user.name}</Descriptions.Item>
                      <Descriptions.Item label="Phone">{detail.user.phone}</Descriptions.Item>
                      <Descriptions.Item label="Pet">{detail.pet.name} ({detail.pet.sizeCategory})</Descriptions.Item>
                      <Descriptions.Item label="Service">{detail.service.name}</Descriptions.Item>
                      <Descriptions.Item label="Date">{dayjs(detail.slot.date).format('ddd, DD MMM YYYY')}</Descriptions.Item>
                      <Descriptions.Item label="Time">{detail.slot.startTime} – {detail.slot.endTime}</Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <Tag color={STATUS_COLOR[detail.status]}>{detail.status}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Payment">
                        {detail.payment
                          ? <><Tag color="green">{detail.payment.method}</Tag> {CUR} {detail.payment.amount}</>
                          : 'Unpaid'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Service fee">{CUR} {detail.serviceFee}</Descriptions.Item>
                      <Descriptions.Item label="Add-ons">{CUR} {detail.addonFee}</Descriptions.Item>
                      {detail.discountAmount > 0 && (
                        <Descriptions.Item label="Discount">- {CUR} {detail.discountAmount} ({detail.couponCode})</Descriptions.Item>
                      )}
                      <Descriptions.Item label="Total" span={2}><strong>{CUR} {detail.totalAmount}</strong></Descriptions.Item>
                      {detail.notes && <Descriptions.Item label="Customer notes" span={2}>{detail.notes}</Descriptions.Item>}
                      {detail.addons.length > 0 && (
                        <Descriptions.Item label="Add-ons" span={2}>
                          {detail.addons.map((a) => `${a.addonName} (${CUR} ${a.addonPrice})`).join(', ')}
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                    <div style={{ marginTop: 16 }}>
                      <Button type="primary" size="small" style={{ backgroundColor: c.primary }}
                        onClick={() => { setStatusModal({ open: true, appt: detail }); setNewStatus(detail.status); }}>
                        Update Status
                      </Button>
                    </div>
                  </div>
                ),
              },
              {
                key: 'activity',
                label: 'Activity Log',
                children: (
                  <Timeline
                    items={(detail.activities ?? []).map((a) => ({
                      children: (
                        <div>
                          <strong style={{ fontSize: 12 }}>{a.action}</strong>
                          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 8 }}>by {a.performedByType}</span>
                          {a.note && <div style={{ fontSize: 12, color: '#4b5563' }}>{a.note}</div>}
                          <div style={{ fontSize: 10, color: '#9ca3af' }}>
                            {dayjs(a.createdAt).format('DD MMM YYYY HH:mm')}
                          </div>
                        </div>
                      ),
                    }))}
                  />
                ),
              },
            ]}
          />
        )}
      </Modal>

      {/* Status Update Modal */}
      <Modal
        title="Update Appointment Status"
        open={statusModal.open}
        onOk={handleStatusUpdate}
        onCancel={() => setStatusModal({ open: false })}
        confirmLoading={saving}
      >
        <div style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 8, fontSize: 13 }}>New Status</p>
          <Select
            value={newStatus}
            onChange={setNewStatus}
            style={{ width: '100%', marginBottom: 12 }}
            options={STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
          />
          <p style={{ marginBottom: 8, fontSize: 13 }}>Note (optional)</p>
          <Input.TextArea
            rows={2}
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            placeholder="Internal note..."
          />
        </div>
      </Modal>
    </div>
  );
}
