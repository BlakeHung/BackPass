"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { LoadingButton } from "@/components/ui/loading-button";
import { useTranslations } from 'next-intl';
import { Input } from "@/components/ui/input";

interface GroupMember {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  name: string;
  participants: GroupMember[];
}

const transactionSchema = z.object({
  amount: z.number().positive("金額必須大於 0"),
  categoryId: z.string().min(1, "請選擇類別"),
  date: z.coerce.date(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  activityId: z.string().optional().nullable(),
  payerId: z.string().optional().nullable(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface Category {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME';
}

interface TransactionFormProps {
  categories: Category[];
  activities: Activity[];
  type: 'EXPENSE' | 'INCOME';
  defaultValues?: {
    amount: number;
    categoryId: string;
    activityId?: string | null;
    payerId?: string | null;
    date: Date;
    description?: string;
    images?: string[];
  };
  transactionId?: string;
  canManagePayments?: boolean;
}

export function TransactionForm({ 
  categories, 
  activities,
  type,
  defaultValues,
  transactionId,
  canManagePayments,
}: TransactionFormProps) {
  const t = useTranslations('transactions');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>(
    defaultValues?.images || []
  );
  const [potentialPayers, setPotentialPayers] = useState<GroupMember[]>([]);
  const [activitySearch, setActivitySearch] = useState("");
  const [payerSearch, setPayerSearch] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: defaultValues ? {
        ...defaultValues,
        date: defaultValues.date || new Date(),
        activityId: defaultValues.activityId === undefined ? null : defaultValues.activityId,
        payerId: defaultValues.payerId === undefined ? null : defaultValues.payerId,
    } : {
        date: new Date(),
        activityId: null,
        payerId: null,
    }
  });
  
  const watchedActivityId = watch("activityId");

  useEffect(() => {
    if (watchedActivityId) {
      const selectedActivity = activities.find(act => act.id === watchedActivityId);
      setPotentialPayers(selectedActivity?.participants || []);
    } else {
      setPotentialPayers([]);
      setValue('payerId', null);
    }
  }, [watchedActivityId, activities, setValue]);

  useEffect(() => {
    if (defaultValues?.activityId) {
        const initialActivity = activities.find(act => act.id === defaultValues.activityId);
        setPotentialPayers(initialActivity?.participants || []);
    }
  }, [defaultValues, activities]);

  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "amis_management");

    const response = await fetch(
      "https://api.cloudinary.com/v1_1/dfaittd9e/image/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();
    return data.secure_url;
  };

  const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const urls = await Promise.all(files.map(handleImageUpload));
      setPreviewImages((prev) => [...prev, ...urls]);
      setValue("images", urls);
    }
  };

  const onSubmit = async (data: TransactionFormData) => {
    try {
      setIsSubmitting(true);
      
      const url = transactionId 
        ? `/api/transactions/${transactionId}` 
        : '/api/transactions';
      
      const method = transactionId ? 'PUT' : 'POST';
      const requestData = {
        ...data,
        type,
        groupMemberId: data.payerId,
      };
      
      console.log('Sending data:', JSON.stringify(requestData, null, 2));
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('提交失敗');
      }

      window.location.href = '/transactions';
    } catch (error) {
      console.error('Error:', error);
      alert('提交失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredActivities = activities.filter(activity => 
    activity.name.toLowerCase().includes(activitySearch.toLowerCase())
  );

  const filteredPayers = potentialPayers.filter(payer => 
    payer.name.toLowerCase().includes(payerSearch.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('amount')}
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          onKeyDown={(e) => {
            if (!/[\d.]/.test(e.key) && 
                !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
              e.preventDefault();
            }
          }}
          {...register("amount", { valueAsNumber: true })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {errors.amount && (
          <p className="mt-1 text-sm text-red-600">{t('amount_required')}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('category')}
        </label>
        <select
          {...register("categoryId")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">{t('select_category')}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-600">{t('category_required')}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('date')}
        </label>
        <input
          type="date"
          {...register("date", { valueAsDate: true })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {errors.date && (
          <p className="mt-1 text-sm text-red-600">{t('date_required')}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('description')}
        </label>
        <textarea
          {...register("description")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{t('description_error')}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('images')}
        </label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={onImageChange}
          className="mt-1 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
        />
        <div className="mt-2 grid grid-cols-3 gap-2">
          {previewImages.map((url, index) => (
            <div key={index} className="relative aspect-square">
              <Image
                src={url}
                alt={t('image_preview', { index: index + 1 })}
                width={100}
                height={100}
                className="object-cover rounded-md"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="activityId">{t('activity')}</Label>
        <Select
          value={watch('activityId') || 'none'}
          onValueChange={(value) => setValue('activityId', value === 'none' ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('select_activity')} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-background p-2">
              <Input
                placeholder={t('search_activity')}
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="mb-2"
              />
            </div>
            <SelectItem value="none">{t('no_activity')}</SelectItem>
            {filteredActivities.map((activity) => (
              <SelectItem key={activity.id} value={activity.id}>
                {activity.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payerId">{t('payer')}</Label>
        <Select
          value={watch('payerId') || undefined}
          onValueChange={(value) => setValue('payerId', value)}
          disabled={!watchedActivityId || potentialPayers.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('select_payer')} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-background p-2">
              <Input
                placeholder={t('search_payer')}
                value={payerSearch}
                onChange={(e) => setPayerSearch(e.target.value)}
                className="mb-2"
              />
            </div>
            {potentialPayers.length === 0 && watchedActivityId ? (
              <SelectItem value="no_participants" disabled>
                {t('no_participants_for_activity')}
              </SelectItem>
            ) : (
              filteredPayers.map((payer) => (
                <SelectItem key={payer.id} value={payer.id}>
                  {payer.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.payerId && (
          <p className="mt-1 text-sm text-red-600">{t('payer_required')}</p>
        )}
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          {t('cancel')}
        </button>
        <LoadingButton
          isLoading={isSubmitting}
          loadingText={t('saving')}
        >
          {t('save')}
        </LoadingButton>
      </div>
    </form>
  );
}