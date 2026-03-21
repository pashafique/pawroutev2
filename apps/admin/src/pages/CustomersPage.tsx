import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Input, Tag, Space,
  Descriptions, Avatar, Switch, message, Tabs, Timeline,
} from 'antd';
import { UserOutlined, SearchOutlined, StopOutlined, CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { appConfig } from '@pawroute/config';
import { api } from '../lib/api';

const c = appConfig.brand.colors;

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  isActive: boolean;
  isBlocked: boolean;
  blockReason?: string;
  otpVerified: boolean;
  createdAt: string;
  _count?: { pets: number; appointments: number };
}

interface CustomerDetail extends Customer {
  pets: { id: string; name: string; type: string; sizeCategory: string }[];
  appointments: { id: string; bookingRef: string; status: string; createdAt: string; service: { name: string } }[];
  adminNotes: { id: string; note: string; createdAt: string; admin: { name: string } }[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/customers', {
        params: { page: p, pageSize: 20, search: search || undefined },
      });
      setCustomers(res.data.data.customers);
      setTotal(res.data.data.total);
    } catch { message.error('Failed to load customers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page]);

  const openDetail = async (id: string) => {
    try {
      const res = await api.get(`/admin/customers/${id}`);
      setDetail(res.data.data);
    } catch { message.error('Failed to load customer'); }
  };

  const handleBlock = async (id: string, block: boolean, reason?: string) => {
    try {
      await api.patch(`/admin/customers/${id}`, { isBlocked: block, blockReason: block ? (reason ?? 'Blocked by admin') : null });
      message.success(block ? 'Customer blocked' : 'Customer unblocked');
      load();
      if (detail?.id === id) openDetail(id);
    } catch { message.error('Failed'); }
  };

  const handleAddNote = async () => {
    if (!detail || !noteText.trim()) return;
    setSaving(true);
    try {
      await api.post(`/admin/customers/${detail.id}/notes`, { note: noteText });
      setNoteText('');
      openDetail(detail.id);
    } catch { message.error('Failed to save note'); }
    finally { setSaving(false); }
  };

  const columns = [
    {
      title: 'Customer',
      key: 'customer',
      render: (_: any, r: Customer) => (
        <Space>
          <Avatar src={r.profilePhoto} icon={<UserOutlined />} size="small" />
          <div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{r.email}</div>
          </div>
        </Space>
      ),
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (v: string) => v || '—' },
    {
      title: 'Pets / Appts',
      key: 'counts',
      render: (_: any, r: Customer) => `${r._count?.pets ?? 0} pets · ${r._count?.appointments ?? 0} bookings`,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, r: Customer) => (
        <Space size={4}>
          {r.isBlocked ? <Tag color="red">Blocked</Tag> : <Tag color="green">Active</Tag>}
          {r.otpVerified && <Tag color="blue">Verified</Tag>}
        </Space>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'created',
      render: (v: string) => dayjs(v).format('DD MMM YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: Customer) => (
        <Space>
          <Button size="small" onClick={() => openDetail(r.id)}>View</Button>
          {r.isBlocked
            ? <Button size="small" icon={<CheckOutlined />} onClick={() => handleBlock(r.id, false)}>Unblock</Button>
            : <Button size="small" danger icon={<StopOutlined />} onClick={() => handleBlock(r.id, true)}>Block</Button>
          }
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: c.primary, fontSize: 22, fontWeight: 700 }}>Customers</h1>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search name, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={() => { setPage(1); load(1); }}
          style={{ width: 280 }}
        />
      </Space>

      <Table
        dataSource={customers}
        rowKey="id"
        columns={columns}
        loading={loading}
        size="small"
        pagination={{
          total, current: page, pageSize: 20,
          onChange: (p) => setPage(p),
          showTotal: (t) => `${t} customers`,
        }}
      />

      {/* Customer Detail Modal */}
      <Modal
        title={detail?.name}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={700}
      >
        {detail && (
          <Tabs
            items={[
              {
                key: 'profile',
                label: 'Profile',
                children: (
                  <div>
                    <Descriptions column={2} size="small" bordered>
                      <Descriptions.Item label="Name">{detail.name}</Descriptions.Item>
                      <Descriptions.Item label="Email">{detail.email}</Descriptions.Item>
                      <Descriptions.Item label="Phone">{detail.phone || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Verified">{detail.otpVerified ? 'Yes' : 'No'}</Descriptions.Item>
                      <Descriptions.Item label="Joined">{dayjs(detail.createdAt).format('DD MMM YYYY')}</Descriptions.Item>
                      <Descriptions.Item label="Status">
                        {detail.isBlocked
                          ? <Tag color="red">Blocked: {detail.blockReason}</Tag>
                          : <Tag color="green">Active</Tag>}
                      </Descriptions.Item>
                    </Descriptions>
                    <div style={{ marginTop: 12 }}>
                      {detail.isBlocked
                        ? <Button onClick={() => handleBlock(detail.id, false)}>Unblock Customer</Button>
                        : <Button danger onClick={() => handleBlock(detail.id, true, 'Blocked by admin')}>Block Customer</Button>
                      }
                    </div>
                  </div>
                ),
              },
              {
                key: 'pets',
                label: `Pets (${detail.pets.length})`,
                children: (
                  <div>
                    {detail.pets.map((pet) => (
                      <div key={pet.id} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{pet.type === 'DOG' ? '🐶' : '🐱'}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{pet.name}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{pet.sizeCategory}</div>
                        </div>
                      </div>
                    ))}
                    {detail.pets.length === 0 && <p style={{ color: '#9ca3af' }}>No pets</p>}
                  </div>
                ),
              },
              {
                key: 'appointments',
                label: `Bookings (${detail.appointments.length})`,
                children: (
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {detail.appointments.map((a) => (
                      <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontFamily: 'monospace', fontSize: 11 }}>{a.bookingRef}</div>
                          <div style={{ fontSize: 13 }}>{a.service.name}</div>
                        </div>
                        <Tag>{a.status}</Tag>
                      </div>
                    ))}
                    {detail.appointments.length === 0 && <p style={{ color: '#9ca3af' }}>No bookings</p>}
                  </div>
                ),
              },
              {
                key: 'notes',
                label: 'Admin Notes',
                children: (
                  <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      <Input.TextArea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add internal note..."
                        rows={2}
                        style={{ flex: 1 }}
                      />
                      <Button type="primary" onClick={handleAddNote} loading={saving}
                        style={{ backgroundColor: c.primary }}>
                        Add
                      </Button>
                    </div>
                    <Timeline
                      items={detail.adminNotes.map((n) => ({
                        children: (
                          <div>
                            <div style={{ fontSize: 13 }}>{n.note}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>
                              {n.admin?.name ?? 'Admin'} · {dayjs(n.createdAt).format('DD MMM YYYY HH:mm')}
                            </div>
                          </div>
                        ),
                      }))}
                    />
                    {detail.adminNotes.length === 0 && <p style={{ color: '#9ca3af' }}>No notes yet</p>}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}
