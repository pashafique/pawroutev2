/**
 * @file AdminUsersPage.tsx
 * @description Admin user management — list and create admin accounts (SUPER_ADMIN only).
 */

import { useEffect, useState } from 'react';
import {
  Table, Button, Tag, Modal, Form, Input, Select,
  Typography, message, Space,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../lib/api';

const { Title } = Typography;

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'GROOMER';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  createdAt: string;
}

const ROLE_COLOR: Record<AdminRole, string> = {
  SUPER_ADMIN: 'red',
  ADMIN: 'blue',
  GROOMER: 'green',
};

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users');
      setAdmins(data.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        message.warning('Only Super Admins can view admin users');
      } else {
        message.error('Failed to load admin users');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await api.post('/admin/users', values);
      message.success('Admin user created');
      setModalOpen(false);
      form.resetFields();
      fetchAdmins();
    } catch (err: any) {
      if (err?.response) message.error(err.response?.data?.error ?? 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (v: string) => <span className="font-medium">{v}</span>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      render: (v: AdminRole) => <Tag color={ROLE_COLOR[v]}>{v.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={3} style={{ margin: 0 }}>Admin Users</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
          Add Admin
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={admins}
        loading={loading}
        pagination={false}
      />

      <Modal
        title="Create Admin User"
        open={modalOpen}
        onOk={handleCreate}
        confirmLoading={saving}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Full Name" rules={[{ required: true, min: 2 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, min: 8, message: 'At least 8 characters' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Super Admin', value: 'SUPER_ADMIN' },
                { label: 'Admin', value: 'ADMIN' },
                { label: 'Groomer', value: 'GROOMER' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
