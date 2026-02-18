'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useTheme } from '@/hooks/useTheme';

interface Category {
  _id: string;
  name: string;
  color?: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
  });
  const [submitting, setSubmitting] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await api.get<{ categories: Category[] }>('/categories');
      setCategories(data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, {
          name: formData.name,
          color: formData.color,
        });
      } else {
        await api.post('/categories', {
          name: formData.name,
          color: formData.color,
        });
      }
      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: '', color: '#3B82F6' });
      fetchCategories();
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar categoria');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      color: category.color || '#3B82F6',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta categoria?')) {
      return;
    }

    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (error: any) {
      alert(error.message || 'Erro ao remover categoria');
    }
  };

  const handleOpenModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', color: '#3B82F6' });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', color: '#3B82F6' });
  };

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${
          isDark
            ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900'
            : 'bg-gray-50'
        }`}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1
            className={`text-3xl font-bold ${
              isDark ? 'text-slate-100' : 'text-gray-900'
            }`}
          >
            Categorias
          </h1>
          <p
            className={`mt-2 text-sm ${
              isDark ? 'text-slate-300' : 'text-gray-600'
            }`}
          >
            Organize seus gastos por categorias
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-md hover:bg-emerald-400"
        >
          Adicionar Categoria
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p
              className={`${
                isDark ? 'text-slate-300' : 'text-gray-500'
              }`}
            >
              Nenhuma categoria cadastrada ainda.
            </p>
          </div>
        ) : (
          categories.map((category) => (
            <div
              key={category._id}
              className={`shadow rounded-xl p-6 flex items-center justify-between ${
                isDark
                  ? 'bg-slate-900/80 border border-white/10 backdrop-blur'
                  : 'bg-white border border-gray-100'
              }`}
            >
              <div className="flex items-center">
                {category.color && (
                  <div
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: category.color }}
                  ></div>
                )}
                <span
                  className={`text-lg font-medium ${
                    isDark ? 'text-slate-100' : 'text-gray-900'
                  }`}
                >
                  {category.name}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(category)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(category._id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remover
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Adicionar/Editar Categoria */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCategory ? 'Editar Categoria' : 'Adicionar Categoria'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome da Categoria
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="Ex: Saúde, Alimentação..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value.toUpperCase() })}
                      className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value.toUpperCase() })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="#3B82F6"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Formato: #RRGGBB (ex: #3B82F6)
                  </p>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {submitting ? 'Salvando...' : editingCategory ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



