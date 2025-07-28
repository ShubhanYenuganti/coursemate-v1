import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface ManageEnrollmentModalProps {
    courseId: string;
}

interface Enrollment {
    user_id: string;
    username: string;
    status: string;
    access_privileges?: boolean;
    requested_at?: string;
    approved_at?: string;
    updated_at?: string;
}

const ManageEnrollmentModal: React.FC<ManageEnrollmentModalProps> = ({ courseId }) => {
    const [pending, setPending] = useState<Enrollment[]>([]);
    const [approved, setApproved] = useState<Enrollment[]>([]);
    const [rejected, setRejected] = useState<Enrollment[]>([]);

    // Modal for pending requests approval/denial
    const [selectedUser, setSelectedUser] = useState<Enrollment | null>(null);
    const [manageModalOpen, setManageModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<'creator' | 'enrollee'>('enrollee');

    // Modal to reapprove a rejected/revoked user
    const [confirmReapproveUser, setConfirmReapproveUser] = useState<Enrollment | null>(null);

    // Update an approved user
    const [updateUser, setUpdateUser] = useState<Enrollment | null>(null);

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        };

        const body = JSON.stringify({ course_id: courseId });
        const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";

        const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
            fetch(`${api}/api/course_enrollment/pending_enrollments`, {
                method: 'POST',
                headers,
                body,
            }),
            fetch(`${api}/api/course_enrollment/approved_enrollments`, {
                method: 'POST',
                headers,
                body,
            }),
            fetch(`${api}/api/course_enrollment/rejected_or_revoked_enrollments`, {
                method: 'POST',
                headers,
                body,
            }),
        ]);

        if (!pendingRes.ok || !approvedRes.ok || !rejectedRes.ok) {
            throw new Error("Failed to fetch enrollment data");
        }

        setPending(await pendingRes.json());
        setApproved(await approvedRes.json());
        setRejected(await rejectedRes.json());
    };

    useEffect(() => {
        fetchData();
    }, [courseId]);

    return (
        <div className="mt-6 max-w-5xl mx-auto bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Manage Enrollment Requests</h2>
            <Tabs defaultValue="enrolled" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="enrolled">Creators & Enrollees</TabsTrigger>
                    <TabsTrigger value="pending">Pending Requests</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected / Revoked</TabsTrigger>
                </TabsList>

                <TabsContent value="enrolled">
                    <ul>
                        {approved.map((e) => (
                            <li key={e.user_id} className="p-2 border rounded space-y-1">
                                <div>
                                    <strong>User:</strong> {e.username} <br />
                                    <strong>Status:</strong> {e.status} <br />
                                    <strong>Creator Privileges:</strong> {e.access_privileges ? 'Yes' : 'No'}
                                </div>
                                <button
                                    className="mt-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                                    onClick={() => {
                                        setUpdateUser(e);
                                        setSelectedRole(e.access_privileges ? 'creator' : 'enrollee');
                                    }}
                                >
                                    Update User
                                </button>
                            </li>
                        ))}
                    </ul>


                    {updateUser && (
                        <Dialog open={true} onOpenChange={() => setUpdateUser(null)}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Update {updateUser.username}</DialogTitle>
                                </DialogHeader>

                                {/* Role selection */}
                                <div className="space-y-3 mt-4">
                                    <div>
                                        <label className="font-semibold">Assign Role:</label>
                                        <div className="mt-2 space-x-4">
                                            <label>
                                                <input
                                                    type="radio"
                                                    value="enrollee"
                                                    checked={selectedRole === 'enrollee'}
                                                    onChange={() => setSelectedRole('enrollee')}
                                                />{' '}
                                                Enrollee
                                            </label>
                                            <label>
                                                <input
                                                    type="radio"
                                                    value="creator"
                                                    checked={selectedRole === 'creator'}
                                                    onChange={() => setSelectedRole('creator')}
                                                />{' '}
                                                Co-Creator
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-4 pt-4">
                                        <button
                                            className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
                                            onClick={() => setUpdateUser(null)}
                                        >
                                            Cancel
                                        </button>

                                        {/* ✅ Update role */}
                                        <button
                                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                            onClick={async () => {
                                                const token = localStorage.getItem('token');
                                                const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
                                                const res = await fetch(`${api}/api/course_enrollment/update`, {
                                                    method: 'PUT',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        Authorization: `Bearer ${token}`,
                                                    },
                                                    body: JSON.stringify({
                                                        course_id: courseId,
                                                        user_id: updateUser.user_id,
                                                        status: 'approved',
                                                        access_privileges: selectedRole === 'creator',
                                                    }),
                                                });

                                                if (res.ok) {
                                                    await fetchData();
                                                    setUpdateUser(null);
                                                } else {
                                                    alert("Failed to update role.");
                                                }
                                            }}
                                        >
                                            Save Role
                                        </button>

                                        {/* ❌ Revoke enrollment */}
                                        <button
                                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                            onClick={async () => {
                                                const token = localStorage.getItem('token');
                                                const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
                                                const res = await fetch(`${api}/api/course_enrollment/update`, {
                                                    method: 'PUT',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        Authorization: `Bearer ${token}`,
                                                    },
                                                    body: JSON.stringify({
                                                        course_id: courseId,
                                                        user_id: updateUser.user_id,
                                                        status: 'revoked',
                                                    }),
                                                });

                                                if (res.ok) {
                                                    await fetchData();
                                                    setUpdateUser(null);
                                                } else {
                                                    alert("Failed to revoke enrollment.");
                                                }
                                            }}
                                        >
                                            Revoke Enrollment
                                        </button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}

                </TabsContent>

                <TabsContent value="pending">
                    <ul className="space-y-2">
                        {pending.map((e) => (
                            <li key={e.user_id} className="p-2 border rounded">
                                <strong>User:</strong> {e.username} <br />
                                <strong>Status:</strong> {e.status} <br />
                                <strong>Requested At:</strong>{' '}
                                {e.requested_at
                                    ? new Date(e.requested_at).toLocaleString(undefined, {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                    })
                                    : 'N/A'}
                                <div className="mt-2">
                                    <button
                                        className="mt-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                                        onClick={() => {
                                            setSelectedUser(e);
                                            setSelectedRole('enrollee'); // default role
                                            setManageModalOpen(true);
                                        }}
                                    >
                                        Manage Request
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>

                    {/* Manage Request Modal */}
                    {selectedUser && (
                        <Dialog open={manageModalOpen} onOpenChange={setManageModalOpen}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Manage Enrollment for {selectedUser.username}</DialogTitle>
                                </DialogHeader>

                                <div className="space-y-4 mt-4">
                                    <div>
                                        <label className="font-semibold">Assign Role:</label>
                                        <div className="mt-2 space-x-4">
                                            <label>
                                                <input
                                                    type="radio"
                                                    value="enrollee"
                                                    checked={selectedRole === 'enrollee'}
                                                    onChange={() => setSelectedRole('enrollee')}
                                                />{' '}
                                                Enrollee
                                            </label>
                                            <label>
                                                <input
                                                    type="radio"
                                                    value="creator"
                                                    checked={selectedRole === 'creator'}
                                                    onChange={() => setSelectedRole('creator')}
                                                />{' '}
                                                Co-Creator
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-4">
                                        <button
                                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                            onClick={async () => {
                                                const token = localStorage.getItem('token');
                                                const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
                                                const res = await fetch(`${api}/api/course_enrollment/handle_request`, {
                                                    method: 'PUT',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        Authorization: `Bearer ${token}`,
                                                    },
                                                    body: JSON.stringify({
                                                        course_id: courseId,
                                                        user_id: selectedUser.user_id,
                                                        status: 'approved',
                                                        access_privileges: selectedRole === 'creator',  // ✅ fix key name
                                                    }),
                                                });


                                                if (res.ok) {
                                                    setManageModalOpen(false);
                                                    setSelectedUser(null);
                                                    // optionally refresh the data or update state here
                                                    await fetchData();
                                                } else {
                                                    alert("Failed to approve enrollment.");
                                                }
                                            }}
                                        >
                                            Approve
                                        </button>
                                        <button
                                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                            onClick={async () => {
                                                const token = localStorage.getItem('token');
                                                const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
                                                const res = await fetch(
                                                    `${api}/api/course_enrollment/update`,
                                                    {
                                                        method: 'PUT',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            Authorization: `Bearer ${token}`,
                                                        },
                                                        body: JSON.stringify({
                                                            course_id: courseId,
                                                            user_id: selectedUser.user_id,
                                                            status: 'rejected'
                                                        }),

                                                    }
                                                );

                                                if (res.ok) {
                                                    setManageModalOpen(false);
                                                    setSelectedUser(null);
                                                    // optionally refresh the data or update state here
                                                    await fetchData();
                                                } else {
                                                    alert("Failed to reject enrollment.");
                                                }
                                            }}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </TabsContent>


                <TabsContent value="rejected">
                    <ul className="space-y-2">
                        {rejected.map((e) => (
                            <li key={e.user_id} className="p-2 border rounded space-y-2">
                                <div>
                                    <strong>User:</strong> {e.username} <br />
                                    <strong>Status:</strong> {e.status} <br />
                                    <strong>Updated At:</strong>{' '}
                                    {e.updated_at
                                        ? new Date(e.updated_at).toLocaleString(undefined, {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true,
                                        })
                                        : 'N/A'}
                                </div>
                                <button
                                    className="mt-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                                    onClick={() => setConfirmReapproveUser(e)}
                                >
                                    Approve User
                                </button>
                            </li>
                        ))}
                    </ul>

                    {confirmReapproveUser && (
                        <Dialog open={true} onOpenChange={() => setConfirmReapproveUser(null)}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Approve {confirmReapproveUser.username} Again</DialogTitle>
                                </DialogHeader>
                                <p className="mb-4">
                                    Please select the role to assign to <strong>{confirmReapproveUser.username}</strong>.
                                </p>

                                {/* Role selection radio buttons */}
                                <div className="space-y-2">
                                    <label className="font-semibold">Assign Role:</label>
                                    <div className="mt-1 space-x-4">
                                        <label>
                                            <input
                                                type="radio"
                                                value="enrollee"
                                                checked={selectedRole === 'enrollee'}
                                                onChange={() => setSelectedRole('enrollee')}
                                            />{' '}
                                            Enrollee
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                value="creator"
                                                checked={selectedRole === 'creator'}
                                                onChange={() => setSelectedRole('creator')}
                                            />{' '}
                                            Co-Creator
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 mt-6">
                                    <button
                                        className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
                                        onClick={() => setConfirmReapproveUser(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                        onClick={async () => {
                                            const token = localStorage.getItem('token');
                                            const api = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5173';
                                            const res = await fetch(`${api}/api/course_enrollment/update`, {
                                                method: 'PUT',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    Authorization: `Bearer ${token}`,
                                                },
                                                body: JSON.stringify({
                                                    course_id: courseId,
                                                    user_id: confirmReapproveUser.user_id,
                                                    status: 'approved',
                                                    access_privileges: selectedRole === 'creator',
                                                }),
                                            });

                                            if (res.ok) {
                                                await fetchData();
                                                setConfirmReapproveUser(null);
                                            } else {
                                                alert('Failed to re-approve user.');
                                            }
                                        }}
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}

                </TabsContent>

            </Tabs>
        </div>
    );

};
export default ManageEnrollmentModal;
