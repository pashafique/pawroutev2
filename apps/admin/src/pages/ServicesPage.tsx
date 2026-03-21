import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Switch,
  Popconfirm, Space, Tag, Collapse, message, Select,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { appConfig } from '@pawroute/config';
import { api } from '../lib/api';

const c = appConfig.brand.colors;
const CUR = appConfig.locale.currencySymbol;
const SIZES = ['SMALL', 'MEDIUM', 'LARGE', 'XL'] as const;

interface Pricing { sizeLabel: string; price: number; }
interface Addon { id: string; name: string; price: number; isActive: boolean; }
interface Service {
  id: string; name: string; description: string; durationMin: number;
  sortOrder: number; isActive: boolean; categoryId: string;
  pricing: Pricing[]; addons: Addon[];
}
interface Category { id: string; name: string; petType: string; services?: Service[]; }

export default function ServicesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [svcModal, setSvcModal] = useState<{ open: boolean; service?: Service; categoryId?: string }>({ open: false });
  const [addonModal, setAddonModal] = useState<{ open: boolean; serviceId?: string; addon?: Addon }>({ open: false });
  const [pricingModal, setPricingModal] = useState<{ open: boolean; service?: Service }>({ open: false });
  const [svcForm] = Form.useForm();
  const [addonForm] = Form.useForm();
  const [pricingForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/services/categories');
      setCategories(res.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Service CRUD ────────────────────────────────────────────────────────────
  const openCreateService = (categoryId: string) => {
    svcForm.resetFields();
    setSvcModal({ open: true, categoryId });
  };

  const openEditService = (svc: Service) => {
    svcForm.setFieldsValue(svc);
    setSvcModal({ open: true, service: svc });
  };

  const handleSaveService = async () => {
    const vals = await svcForm.validateFields();
    setSaving(true);
    try {
      if (svcModal.service) {
        await api.patch(`/services/${svcModal.service.id}`, vals);
        message.success('Service updated');
      } else {
        await api.post('/services', { ...vals, categoryId: svcModal.categoryId });
        message.success('Service created');
      }
      setSvcModal({ open: false });
      load();
    } catch { message.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await api.delete(`/services/${id}`);
      message.success('Service deleted');
      load();
    } catch { message.error('Failed to delete'); }
  };

  const handleToggleService = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/services/${id}`, { isActive });
      load();
    } catch { message.error('Failed to update'); }
  };

  // ── Pricing ─────────────────────────────────────────────────────────────────
  const openPricing = (svc: Service) => {
    const vals: Record<string, number> = {};
    svc.pricing.forEach((p) => { vals[`price_${p.sizeLabel}`] = p.price; });
    pricingForm.setFieldsValue(vals);
    setPricingModal({ open: true, service: svc });
  };

  const handleSavePricing = async () => {
    const vals = await pricingForm.validateFields();
    const entries = SIZES.map((s) => ({ sizeLabel: s, price: vals[`price_${s}`] }))
      .filter((e) => e.price != null);
    setSaving(true);
    try {
      await api.put(`/services/${pricingModal.service!.id}/pricing`, { entries });
      message.success('Pricing saved');
      setPricingModal({ open: false });
      load();
    } catch { message.error('Failed to save pricing'); }
    finally { setSaving(false); }
  };

  // ── Addons ──────────────────────────────────────────────────────────────────
  const openCreateAddon = (serviceId: string) => {
    addonForm.resetFields();
    setAddonModal({ open: true, serviceId });
  };

  const openEditAddon = (serviceId: string, addon: Addon) => {
    addonForm.setFieldsValue(addon);
    setAddonModal({ open: true, serviceId, addon });
  };

  const handleSaveAddon = async () => {
    const vals = await addonForm.validateFields();
    setSaving(true);
    try {
      if (addonModal.addon) {
        await api.patch(`/services/addons/${addonModal.addon.id}`, vals);
        message.success('Add-on updated');
      } else {
        await api.post(`/services/${addonModal.serviceId}/addons`, vals);
        message.success('Add-on created');
      }
      setAddonModal({ open: false });
      load();
    } catch { message.error('Failed to save add-on'); }
    finally { setSaving(false); }
  };

  const handleDeleteAddon = async (addonId: string) => {
    try {
      await api.delete(`/services/addons/${addonId}`);
      message.success('Add-on deleted');
      load();
    } catch { message.error('Failed to delete'); }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: c.primary, fontSize: 22, fontWeight: 700 }}>Service Management</h1>
      </div>

      <Collapse
        defaultActiveKey={categories.map((c) => c.id)}
        style={{ background: 'transparent', border: 'none' }}
        items={categories.map((cat) => ({
          key: cat.id,
          label: (
            <span style={{ fontWeight: 600, color: c.primary }}>
              {cat.name}
              <Tag color={cat.petType === 'DOG' ? 'blue' : 'purple'} style={{ marginLeft: 8 }}>
                {cat.petType}
              </Tag>
            </span>
          ),
          children: (
            <div>
              <div style={{ marginBottom: 12, textAlign: 'right' }}>
                <Button type="primary" size="small" icon={<PlusOutlined />}
                  onClick={() => openCreateService(cat.id)}
                  style={{ backgroundColor: c.primary }}>
                  Add Service
                </Button>
              </div>
              <Table
                dataSource={cat.services ?? []}
                rowKey="id"
                size="small"
                pagination={false}
                expandable={{
                  expandedRowRender: (svc) => (
                    <div style={{ paddingLeft: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <strong>Add-ons</strong>
                        <Button size="small" icon={<PlusOutlined />}
                          onClick={() => openCreateAddon(svc.id)}>
                          Add Add-on
                        </Button>
                      </div>
                      <Table
                        dataSource={svc.addons}
                        rowKey="id" size="small" pagination={false}
                        columns={[
                          { title: 'Name', dataIndex: 'name', key: 'name' },
                          { title: 'Price', dataIndex: 'price', key: 'price',
                            render: (v) => `${CUR} ${v}` },
                          { title: 'Active', dataIndex: 'isActive', key: 'isActive',
                            render: (v, rec) => (
                              <Switch size="small" checked={v}
                                onChange={(val) => api.patch(`/services/addons/${rec.id}`, { isActive: val }).then(load)} />
                            )},
                          { title: 'Actions', key: 'actions',
                            render: (_, rec) => (
                              <Space size="small">
                                <Button size="small" icon={<EditOutlined />}
                                  onClick={() => openEditAddon(svc.id, rec)} />
                                <Popconfirm title="Delete add-on?" onConfirm={() => handleDeleteAddon(rec.id)}>
                                  <Button size="small" danger icon={<DeleteOutlined />} />
                                </Popconfirm>
                              </Space>
                            )},
                        ]}
                      />
                    </div>
                  ),
                }}
                columns={[
                  { title: 'Name', dataIndex: 'name', key: 'name',
                    render: (v, rec) => (
                      <span>
                        <strong>{v}</strong>
                        <br />
                        <small style={{ color: c.textSecondary }}>{rec.description}</small>
                      </span>
                    )},
                  { title: 'Duration', dataIndex: 'durationMin', key: 'dur',
                    render: (v) => `${v} min` },
                  { title: 'Pricing', key: 'pricing',
                    render: (_, rec) => (
                      <div>
                        {rec.pricing.map((p) => (
                          <div key={p.sizeLabel} style={{ fontSize: 11 }}>
                            <span style={{ color: c.textSecondary }}>{p.sizeLabel}: </span>
                            {CUR} {p.price}
                          </div>
                        ))}
                        <Button size="small" type="link" style={{ padding: 0, height: 'auto', fontSize: 11 }}
                          onClick={() => openPricing(rec)}>
                          Edit prices
                        </Button>
                      </div>
                    )},
                  { title: 'Active', dataIndex: 'isActive', key: 'active',
                    render: (v, rec) => (
                      <Switch size="small" checked={v}
                        onChange={(val) => handleToggleService(rec.id, val)} />
                    )},
                  { title: 'Actions', key: 'actions',
                    render: (_, rec) => (
                      <Space size="small">
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEditService(rec)} />
                        <Popconfirm title="Delete service?" onConfirm={() => handleDeleteService(rec.id)}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    )},
                ]}
              />
            </div>
          ),
        }))}
      />

      {/* Service Modal */}
      <Modal
        title={svcModal.service ? 'Edit Service' : 'New Service'}
        open={svcModal.open}
        onOk={handleSaveService}
        onCancel={() => setSvcModal({ open: false })}
        confirmLoading={saving}
      >
        <Form form={svcForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Full Groom" />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="durationMin" label="Duration (minutes)" rules={[{ required: true }]}>
            <InputNumber min={5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="sortOrder" label="Sort Order">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          {svcModal.service && (
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Pricing Modal */}
      <Modal
        title={`Pricing — ${pricingModal.service?.name}`}
        open={pricingModal.open}
        onOk={handleSavePricing}
        onCancel={() => setPricingModal({ open: false })}
        confirmLoading={saving}
      >
        <Form form={pricingForm} layout="vertical" style={{ marginTop: 16 }}>
          {SIZES.map((s) => (
            <Form.Item key={s} name={`price_${s}`} label={`${s} (kg: ${appConfig.petSizes.find((p) => p.key === s)?.min}–${appConfig.petSizes.find((p) => p.key === s)?.max === 9999 ? '30+' : appConfig.petSizes.find((p) => p.key === s)?.max})`}>
              <InputNumber min={0} prefix={CUR} style={{ width: '100%' }} />
            </Form.Item>
          ))}
        </Form>
      </Modal>

      {/* Add-on Modal */}
      <Modal
        title={addonModal.addon ? 'Edit Add-on' : 'New Add-on'}
        open={addonModal.open}
        onOk={handleSaveAddon}
        onCancel={() => setAddonModal({ open: false })}
        confirmLoading={saving}
      >
        <Form form={addonForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Teeth Brushing" />
          </Form.Item>
          <Form.Item name="price" label="Price" rules={[{ required: true }]}>
            <InputNumber min={0} prefix={CUR} style={{ width: '100%' }} />
          </Form.Item>
          {addonModal.addon && (
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
