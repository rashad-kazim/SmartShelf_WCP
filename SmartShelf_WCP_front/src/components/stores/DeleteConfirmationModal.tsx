import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';
import type { StoreRecord } from '@/features/stores/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeleteConfirmationModalProps {
    store: StoreRecord;
    onConfirm: () => void;
    onCancel: () => void;
    isPending?: boolean;
}

const DeleteConfirmationModal = ({ store, onConfirm, onCancel, isPending = false }: DeleteConfirmationModalProps) => {
    const { t } = useTranslation();
    const [confirmationName, setConfirmationName] = useState('');

    const normalizedStoreName = useMemo(() => store.name.trim().toLowerCase(), [store.name]);
    const isDeleteEnabled = confirmationName.trim().toLowerCase() === normalizedStoreName && !isPending;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!isDeleteEnabled) {
            return;
        }

        onConfirm();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
                <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border">
                    <CardTitle className="flex items-center gap-2 text-danger">
                        <AlertTriangle />
                        {t('confirm_deletion')}
                    </CardTitle>
                    <Button onClick={onCancel} disabled={isPending} variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <X size={20} />
                    </Button>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4 pt-6">
                        <p className="text-text-primary">
                            {t('delete_store_confirmation_message', { name: store.name })}
                        </p>
                        <p className="text-sm text-text-muted mt-2">
                            {t('delete_action_irreversible')}
                        </p>
                        <div>
                            <Label htmlFor="delete-store-confirmation" className="mb-2 block">
                                {t('type_store_name_to_confirm')}
                            </Label>
                            <Input
                                id="delete-store-confirmation"
                                type="text"
                                value={confirmationName}
                                onChange={(e) => setConfirmationName(e.target.value)}
                                placeholder={store.name}
                                autoFocus
                                disabled={isPending}
                                className="bg-background disabled:opacity-60"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end gap-4 rounded-b-2xl bg-background/50 pt-6">
                        <Button 
                            onClick={onCancel} 
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            className="rounded-lg"
                        >
                            {t('cancel')}
                        </Button>
                        <Button 
                            type="submit"
                            variant="destructive"
                            size="sm"
                            disabled={!isDeleteEnabled}
                            className="rounded-lg"
                        >
                            {isPending ? t('deleting', 'Deleting...') : t('delete', 'Delete')}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default DeleteConfirmationModal;
