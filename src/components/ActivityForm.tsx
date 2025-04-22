"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { getActivityStatus } from "@/lib/utils";
import { useTranslations } from 'next-intl';

const activitySchema = z.object({
  name: z.string().min(1, "請輸入活動名稱"),
  startDate: z.string().min(1, "請選擇開始日期"),
  endDate: z.string().min(1, "請選擇結束日期"),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  selectedGroups: z.array(z.string()).min(1, "請至少選擇一個群組"),
  groupMembers: z.array(z.object({
    groupId: z.string(),
    memberId: z.string(),
    isParticipating: z.boolean(),
  })).optional(),
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface ActivityFormProps {
  defaultValues?: {
    name: string;
    startDate: Date;
    endDate: Date;
    description?: string;
    enabled: boolean;
    selectedGroups?: string[];
    groupMembers?: {
      groupId: string;
      memberId: string;
      isParticipating: boolean;
    }[];
  };
  activityId?: string;
  groups: {
    id: string;
    name: string;
    members: {
      id: string;
      name: string;
    }[];
  }[];
}

export function ActivityForm({ defaultValues, activityId, groups }: ActivityFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    defaultValues?.selectedGroups || []
  );
  const [groupMembers, setGroupMembers] = useState<ActivityFormData['groupMembers']>(
    defaultValues?.groupMembers || []
  );
  const router = useRouter();
  const t = useTranslations('activity_form');
  const statusT = useTranslations('activities.status_types');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: defaultValues ? {
      ...defaultValues,
      startDate: defaultValues.startDate.toISOString().split('T')[0],
      endDate: defaultValues.endDate.toISOString().split('T')[0],
      enabled: defaultValues.enabled,
      selectedGroups: defaultValues.selectedGroups || [],
      groupMembers: defaultValues.groupMembers || [],
    } : {
      enabled: true,
      selectedGroups: [],
      groupMembers: [],
    },
  });

  // 在編輯模式下，確保 selectedGroups 和 groupMembers 被正確設置
  useEffect(() => {
    if (defaultValues) {
      // 設置群組選擇
      const initialGroups = defaultValues.selectedGroups || [];
      setSelectedGroups(initialGroups);
      setValue('selectedGroups', initialGroups);

      // 設置成員狀態
      const initialMembers = defaultValues.groupMembers || [];
      setGroupMembers(initialMembers);
      setValue('groupMembers', initialMembers);

      // 如果沒有群組成員，初始化為空數組
      if (!initialMembers.length) {
        setGroupMembers([]);
        setValue('groupMembers', []);
      }
    }
  }, [defaultValues, setValue]);

  const handleGroupSelect = (groupId: string) => {
    const newSelectedGroups = selectedGroups.includes(groupId)
      ? selectedGroups.filter(id => id !== groupId)
      : [...selectedGroups, groupId];
    
    setSelectedGroups(newSelectedGroups);
    setValue('selectedGroups', newSelectedGroups);

    // 更新群組成員狀態
    const newGroupMembers = groups
      .filter(group => newSelectedGroups.includes(group.id))
      .flatMap(group => 
        group.members.map(member => {
          // 檢查是否已有該成員的狀態
          const existingMember = groupMembers?.find(
            m => m.groupId === group.id && m.memberId === member.id
          );
          return {
            groupId: group.id,
            memberId: member.id,
            isParticipating: existingMember?.isParticipating ?? true,
          };
        })
      );
    
    setGroupMembers(newGroupMembers);
    setValue('groupMembers', newGroupMembers);
  };

  const handleMemberStatusChange = (groupId: string, memberId: string, field: 'isParticipating', value: boolean) => {
    if (!groupMembers) return;
    
    const newGroupMembers = groupMembers.map(member => {
      if (member.groupId === groupId && member.memberId === memberId) {
        return { ...member, [field]: value };
      }
      return member;
    });
    
    setGroupMembers(newGroupMembers);
    setValue('groupMembers', newGroupMembers);
  };

  const onSubmit = async (data: ActivityFormData) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch(
        activityId ? `/api/activities/${activityId}` : '/api/activities',
        {
          method: activityId ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error(t('submit_failed'));
      }

      router.push('/activities');
      router.refresh();
    } catch (error) {
      console.error('Error:', error);
      alert(t('submit_error_message'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const status = getActivityStatus(
    new Date(watch('startDate')),
    new Date(watch('endDate')),
    watch('enabled'),
    {
      disabled: statusT('disabled'),
      upcoming: statusT('upcoming'),
      ongoing: statusT('ongoing'),
      ended: statusT('ended')
    }
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('activity_name')}
        </label>
        <input
          type="text"
          {...register("name")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{t('name_required')}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('start_date')}
        </label>
        <input
          type="date"
          {...register("startDate")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {errors.startDate && (
          <p className="mt-1 text-sm text-red-600">{t('start_date_required')}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('end_date')}
        </label>
        <input
          type="date"
          {...register("endDate")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {errors.endDate && (
          <p className="mt-1 text-sm text-red-600">{t('end_date_required')}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('description')}
        </label>
        <textarea
          {...register("description")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          rows={3}
        />
      </div>

      <div className="flex items-center justify-between p-4 border rounded-md">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('enabled_status')}
          </label>
          <p className="text-sm text-gray-500">
            {watch('enabled') ? t('activity_enabled') : t('activity_disabled')}
          </p>
        </div>
        <Switch
          checked={watch('enabled')}
          onCheckedChange={(checked) => setValue('enabled', checked)}
        />
      </div>

      <div className="p-4 border rounded-md">
        <span className="text-sm font-medium text-gray-700">{t('current_status')}：</span>
        <span className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
          {status.status}
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('select_groups')}
        </label>
        {groups?.length > 0 ? (
          <div className="mt-2 space-y-2">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`group-${group.id}`}
                  checked={selectedGroups.includes(group.id)}
                  onChange={() => handleGroupSelect(group.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`group-${group.id}`} className="ml-2 block text-sm text-gray-900">
                  {group.name}
                </label>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">{t('no_groups_available')}</p>
        )}
        {errors.selectedGroups && (
          <p className="mt-1 text-sm text-red-600">{t('group_selection_required')}</p>
        )}
      </div>

      {selectedGroups.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('member_participation')}
          </label>
          <div className="mt-2 space-y-4">
            {groups
              .filter(group => selectedGroups.includes(group.id))
              .map(group => (
                <div key={group.id} className="border rounded-md p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">{group.name}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('member_name')}
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('participation_status')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {group.members.map(member => {
                          const memberStatus = groupMembers?.find(
                            m => m.groupId === group.id && m.memberId === member.id
                          );
                          return (
                            <tr key={member.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {member.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  id={`member-${member.id}`}
                                  checked={memberStatus?.isParticipating || false}
                                  onChange={(e) => handleMemberStatusChange(
                                    group.id,
                                    member.id,
                                    'isParticipating',
                                    e.target.checked
                                  )}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md disabled:opacity-50"
      >
        {isSubmitting ? t('processing') : activityId ? t('update_activity') : t('add_activity')}
      </button>
    </form>
  );
} 